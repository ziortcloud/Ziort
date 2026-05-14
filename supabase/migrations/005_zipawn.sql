-- ============================================================
-- Ziort — Migration 005: ZiPawn (Pawnbroking & Pledge Loans)
-- Product code: ZPN | Tables prefix: zpn_
-- Business logic: 100% in TypeScript API — zero RPCs
-- Run after: 004_audit.sql
-- ============================================================

-- fn_set_updated_at is defined here — reused by all later migrations (006+)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ─────────────────────────────────────────────────────────────
-- LOAN SCHEMES — parametric loan products
-- Each entity configures 1+ schemes. Loans reference a scheme.
-- Interest stored as % per MONTH (2.00 = 2%/month = 24%/year)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_schemes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id                 UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id           UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  scheme_code               TEXT NOT NULL,
  scheme_name               TEXT NOT NULL,
  description               TEXT,

  -- Interest (% per month)
  interest_rate_pm          NUMERIC(5,2) NOT NULL CHECK (interest_rate_pm > 0),
  interest_basis            TEXT NOT NULL DEFAULT 'daily'
                              CHECK (interest_basis IN ('daily','monthly')),

  -- LTV % by metal type
  ltv_gold_916              NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  ltv_gold_999              NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  ltv_silver                NUMERIC(5,2) NOT NULL DEFAULT 60.00,
  ltv_other                 NUMERIC(5,2) NOT NULL DEFAULT 50.00,

  -- Loan limits (paise)
  min_loan_paise            BIGINT NOT NULL DEFAULT 100000,    -- ₹1,000
  max_loan_paise            BIGINT NOT NULL DEFAULT 100000000, -- ₹10,00,000

  -- Tenure
  min_tenure_days           INTEGER NOT NULL DEFAULT 30,
  max_tenure_days           INTEGER NOT NULL DEFAULT 365,
  default_tenure_days       INTEGER NOT NULL DEFAULT 180,

  -- Processing fee
  processing_fee_type       TEXT NOT NULL DEFAULT 'percentage'
                              CHECK (processing_fee_type IN ('percentage','fixed')),
  processing_fee_value      NUMERIC(8,2) NOT NULL DEFAULT 0,
  processing_fee_max_paise  BIGINT,

  -- Penalty (% per month on outstanding, charged after grace period)
  penalty_rate_pm           NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  penalty_grace_days        INTEGER NOT NULL DEFAULT 0,

  -- Early closure rebate
  rebate_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  rebate_within_days        INTEGER,
  rebate_type               TEXT CHECK (rebate_type IN ('percentage','fixed')),
  rebate_value              NUMERIC(8,2),

  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  is_default                BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                UUID NOT NULL REFERENCES zi_individuals(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, scheme_code)
);
CREATE INDEX IF NOT EXISTS idx_zpn_schemes_entity ON zpn_schemes(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_schemes_active  ON zpn_schemes(entity_id, is_active);

-- ─────────────────────────────────────────────────────────────
-- CUSTOMERS — pawn borrowers / pledgers
-- Raw mobile never stored. SHA-256 hash used for dedup only.
-- KYC, blacklist, nominee all tracked here.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,           -- ZPCA01 (alpha-grow, per subscription)
  ref_code              TEXT UNIQUE NOT NULL,    -- ZEA01ZPNA01ZPCA01
  entity_id             UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id       UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id             UUID REFERENCES zi_branches(id),

  -- Identity
  full_name             TEXT NOT NULL,
  full_name_local       TEXT,                    -- regional script name
  dob                   DATE,
  gender                TEXT CHECK (gender IN ('male','female','other')),
  occupation            TEXT,

  -- Contact (mobile never stored raw)
  mobile_hash           TEXT NOT NULL,           -- SHA-256
  mobile_last4          TEXT NOT NULL,           -- display only
  alternate_mobile_hash TEXT,
  email                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  pincode               CHAR(6),
  country_code          TEXT NOT NULL DEFAULT 'IN',
  photo_url             TEXT,

  -- KYC
  id_type               TEXT CHECK (id_type IN ('aadhaar','pan','voter_id','passport','driving_license')),
  id_hash               TEXT,                    -- SHA-256 of ID number
  id_last6              TEXT,                    -- last 6 digits for display
  id_proof_url          TEXT,
  address_proof_type    TEXT,
  address_proof_url     TEXT,
  kyc_status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (kyc_status IN ('pending','submitted','verified','rejected','waived')),
  kyc_verified_at       TIMESTAMPTZ,
  kyc_notes             TEXT,

  -- Nominee
  nominee_name          TEXT,
  nominee_relation      TEXT,
  nominee_dob           DATE,
  nominee_mobile_last4  TEXT,
  is_nominee_minor      BOOLEAN NOT NULL DEFAULT FALSE,
  guardian_name         TEXT,
  guardian_id_type      TEXT,
  guardian_id_last6     TEXT,

  -- Blacklist
  is_blacklisted        BOOLEAN NOT NULL DEFAULT FALSE,
  blacklist_reason      TEXT,
  blacklist_at          TIMESTAMPTZ,
  blacklist_by          UUID REFERENCES zi_individuals(id),
  blacklist_expiry      DATE,

  -- Counters (maintained by triggers)
  active_loans          INTEGER NOT NULL DEFAULT 0,
  total_loans           INTEGER NOT NULL DEFAULT 0,
  total_borrowed_paise  BIGINT  NOT NULL DEFAULT 0,
  total_paid_paise      BIGINT  NOT NULL DEFAULT 0,

  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID NOT NULL REFERENCES zi_individuals(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code),
  UNIQUE (subscription_id, mobile_hash)
);
CREATE INDEX IF NOT EXISTS idx_zpn_cust_entity    ON zpn_customers(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_cust_sub       ON zpn_customers(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zpn_cust_mobile    ON zpn_customers(mobile_hash);
CREATE INDEX IF NOT EXISTS idx_zpn_cust_id_hash   ON zpn_customers(id_hash) WHERE id_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zpn_cust_blacklist ON zpn_customers(is_blacklisted) WHERE is_blacklisted = TRUE;
CREATE INDEX IF NOT EXISTS idx_zpn_cust_kyc       ON zpn_customers(kyc_status);

-- ─────────────────────────────────────────────────────────────
-- PAWN TICKETS — the loan application / pledge register entry
-- One ticket → one loan (1:1, loan FK set after disbursal)
-- Workflow: draft → approved → disbursed | cancelled
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_tickets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                 TEXT NOT NULL,          -- PT26A01
  ref_code                TEXT UNIQUE NOT NULL,   -- ZEA01ZPNA01PT26A01
  entity_id               UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id         UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id               UUID NOT NULL REFERENCES zi_branches(id),
  customer_id             UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,
  scheme_id               UUID REFERENCES zpn_schemes(id),

  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','approved','disbursed','cancelled')),

  -- Item summary (trigger-maintained)
  item_count              INTEGER NOT NULL DEFAULT 0,
  total_appraised_paise   BIGINT  NOT NULL DEFAULT 0,  -- sum of net_value from latest valuations
  max_eligible_paise      BIGINT  NOT NULL DEFAULT 0,  -- sum of max_loan from valuations

  -- Approved loan terms (set at disbursal)
  sanctioned_paise        BIGINT,
  interest_rate_pm        NUMERIC(5,2),
  interest_basis          TEXT CHECK (interest_basis IN ('daily','monthly')),
  tenure_days             INTEGER,
  processing_fee_paise    BIGINT NOT NULL DEFAULT 0,

  -- Disbursement
  disbursed_at            TIMESTAMPTZ,
  disbursement_mode       TEXT CHECK (disbursement_mode IN ('cash','bank_transfer','upi','cheque')),
  bank_name               TEXT,
  account_last4           TEXT,

  -- Agreement
  customer_signature_url  TEXT,
  witness_name            TEXT,
  witness_mobile          TEXT,

  -- Cancellation
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,

  loan_id                 UUID,  -- FK added after zpn_loans created (below)

  created_by              UUID NOT NULL REFERENCES zi_individuals(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpn_tickets_entity   ON zpn_tickets(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_tickets_sub      ON zpn_tickets(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zpn_tickets_customer ON zpn_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_zpn_tickets_status   ON zpn_tickets(status);

-- ─────────────────────────────────────────────────────────────
-- PLEDGED ITEMS — physical collateral per ticket
-- item_code: PT26A01-I01, PT26A01-I02, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES zpn_tickets(id) ON DELETE RESTRICT,
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  item_seq        INTEGER NOT NULL,          -- sequential within ticket
  item_code       TEXT NOT NULL,             -- PT26A01-I01

  category        TEXT NOT NULL
                    CHECK (category IN ('gold','silver','diamond','platinum','electronics','vehicle','property_doc','other')),
  description     TEXT NOT NULL,
  purity          TEXT,                      -- 916, 999, 22K, 18K, 950, sterling_925
  weight_grams    NUMERIC(10,3),
  stones_count    INTEGER,
  stone_type      TEXT,
  hallmark_no     TEXT,
  item_photos     TEXT[] NOT NULL DEFAULT '{}',

  status          TEXT NOT NULL DEFAULT 'pledged'
                    CHECK (status IN ('pledged','released','auctioned','lost')),
  released_at     TIMESTAMPTZ,
  auctioned_at    TIMESTAMPTZ,

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, item_seq)
);
CREATE INDEX IF NOT EXISTS idx_zpn_items_ticket ON zpn_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_zpn_items_entity ON zpn_items(entity_id);

-- ─────────────────────────────────────────────────────────────
-- ITEM VALUATIONS — appraisal per item (latest wins)
-- Stores market rate at time of appraisal for audit trail.
-- max_loan_paise = floor(net_value × ltv_pct / 100)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_item_valuations (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                    UUID NOT NULL REFERENCES zpn_items(id) ON DELETE RESTRICT,
  ticket_id                  UUID NOT NULL REFERENCES zpn_tickets(id) ON DELETE RESTRICT,
  entity_id                  UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,

  metal_price_per_gram_paise BIGINT,
  gross_value_paise          BIGINT NOT NULL,
  deduction_pct              NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  net_value_paise            BIGINT NOT NULL,
  ltv_pct                    NUMERIC(5,2) NOT NULL,
  max_loan_paise             BIGINT NOT NULL,

  appraised_by               UUID NOT NULL REFERENCES zi_individuals(id),
  appraised_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  valuation_notes            TEXT,
  is_latest                  BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_zpn_val_item    ON zpn_item_valuations(item_id);
CREATE INDEX IF NOT EXISTS idx_zpn_val_ticket  ON zpn_item_valuations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_zpn_val_latest  ON zpn_item_valuations(ticket_id, is_latest) WHERE is_latest = TRUE;

-- ─────────────────────────────────────────────────────────────
-- LOAN ACCOUNTS — live financial instrument
-- Created at disbursal. outstanding_paise tracks current balance.
-- Running totals maintained by triggers (no RPCs needed).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_loans (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                    TEXT NOT NULL,          -- LN26A01
  ref_code                   TEXT UNIQUE NOT NULL,   -- ZEA01ZPNA01LN26A01
  entity_id                  UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id            UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id                  UUID NOT NULL REFERENCES zi_branches(id),
  customer_id                UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,
  ticket_id                  UUID NOT NULL UNIQUE REFERENCES zpn_tickets(id) ON DELETE RESTRICT,
  scheme_id                  UUID REFERENCES zpn_schemes(id),

  -- Loan terms
  sanctioned_paise           BIGINT NOT NULL CHECK (sanctioned_paise > 0),
  outstanding_paise          BIGINT NOT NULL,        -- trigger-updated on each payment
  interest_rate_pm           NUMERIC(5,2) NOT NULL,
  interest_basis             TEXT NOT NULL DEFAULT 'daily'
                               CHECK (interest_basis IN ('daily','monthly')),
  tenure_days                INTEGER NOT NULL,
  opened_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  maturity_date              DATE NOT NULL,

  -- Status
  status                     TEXT NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','overdue','npa','closed','cancelled','auctioned')),
  closed_at                  TIMESTAMPTZ,
  close_reason               TEXT CHECK (close_reason IN ('full_payment','settlement','renewal','auction','waiver')),

  -- Running totals (trigger-maintained, never updated directly by API)
  total_interest_paid_paise  BIGINT NOT NULL DEFAULT 0,
  total_principal_paid_paise BIGINT NOT NULL DEFAULT 0,
  total_penalty_paid_paise   BIGINT NOT NULL DEFAULT 0,
  payment_count              INTEGER NOT NULL DEFAULT 0,
  last_payment_at            TIMESTAMPTZ,
  last_interest_paid_date    DATE,  -- start date for next interest accrual

  -- Fees
  processing_fee_paise       BIGINT NOT NULL DEFAULT 0,
  net_disbursed_paise        BIGINT NOT NULL,        -- sanctioned - processing_fee

  -- Penalty config (copied from scheme at creation for immutability)
  penalty_rate_pm            NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  penalty_grace_days         INTEGER NOT NULL DEFAULT 0,

  -- NPA / Auction
  npa_declared_at            TIMESTAMPTZ,
  auction_notice_at          TIMESTAMPTZ,
  auction_date               DATE,

  -- Disbursement
  disbursement_mode          TEXT NOT NULL CHECK (disbursement_mode IN ('cash','bank_transfer','upi','cheque')),
  bank_name                  TEXT,
  account_last4              TEXT,
  upi_id                     TEXT,
  cheque_number              TEXT,

  created_by                 UUID NOT NULL REFERENCES zi_individuals(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_entity   ON zpn_loans(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_sub      ON zpn_loans(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_customer ON zpn_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_status   ON zpn_loans(status);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_maturity ON zpn_loans(maturity_date);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_ticket   ON zpn_loans(ticket_id);

-- Back-fill ticket → loan FK (loans table now exists)
ALTER TABLE zpn_tickets
  ADD CONSTRAINT fk_zpn_ticket_loan
  FOREIGN KEY (loan_id) REFERENCES zpn_loans(id);

-- ─────────────────────────────────────────────────────────────
-- LOAN PAYMENTS — individual payments, waterfall pre-calculated
-- API computes: penalty → interest → principal → overpayment
-- Trigger reads pre-calculated portions to update loan totals.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_seq              INTEGER NOT NULL,        -- 1, 2, 3... within loan
  payment_code             TEXT NOT NULL,           -- LN26A01-P001
  loan_id                  UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  entity_id                UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id          UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  customer_id              UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,

  payment_date             DATE NOT NULL,
  payment_amount_paise     BIGINT NOT NULL CHECK (payment_amount_paise > 0),

  -- Waterfall breakdown (all pre-calculated by API before insert)
  penalty_portion_paise    BIGINT NOT NULL DEFAULT 0,
  interest_portion_paise   BIGINT NOT NULL DEFAULT 0,
  principal_portion_paise  BIGINT NOT NULL DEFAULT 0,
  overpayment_paise        BIGINT NOT NULL DEFAULT 0,

  -- Interest period this payment covers
  interest_from_date       DATE,
  interest_to_date         DATE,
  interest_days            INTEGER,

  payment_mode             TEXT NOT NULL
                             CHECK (payment_mode IN ('cash','upi','card','neft','rtgs','cheque')),
  cheque_number            TEXT,
  transaction_ref          TEXT,
  receipt_url              TEXT,

  -- Balance snapshots for audit (API provides these)
  outstanding_before_paise BIGINT NOT NULL,
  outstanding_after_paise  BIGINT NOT NULL,

  received_by              UUID NOT NULL REFERENCES zi_individuals(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loan_id, payment_seq)
);
CREATE INDEX IF NOT EXISTS idx_zpn_pay_loan   ON zpn_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_zpn_pay_entity ON zpn_payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_pay_date   ON zpn_payments(payment_date DESC);

-- ─────────────────────────────────────────────────────────────
-- TRANSACTION LEDGER — double-entry audit trail
-- Every financial event creates a ledger entry.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id       UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  entity_id     UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  entry_date    DATE NOT NULL,
  entry_type    TEXT NOT NULL
                  CHECK (entry_type IN ('disbursement','payment','interest','penalty','renewal','closure','auction')),
  debit_paise   BIGINT NOT NULL DEFAULT 0,
  credit_paise  BIGINT NOT NULL DEFAULT 0,
  balance_paise BIGINT NOT NULL,
  ref_type      TEXT,    -- 'payment' | 'renewal' | 'closure'
  ref_id        UUID,
  narration     TEXT,
  created_by    UUID REFERENCES zi_individuals(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_ledger_loan   ON zpn_ledger(loan_id);
CREATE INDEX IF NOT EXISTS idx_zpn_ledger_entity ON zpn_ledger(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_ledger_date   ON zpn_ledger(entry_date DESC);

-- ─────────────────────────────────────────────────────────────
-- INTEREST ACCRUALS — period-based interest audit records
-- One record per payment that included interest, for full traceability.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_interest_accruals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id              UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  payment_id           UUID REFERENCES zpn_payments(id),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  from_date            DATE NOT NULL,
  to_date              DATE NOT NULL,
  days                 INTEGER NOT NULL,
  principal_base_paise BIGINT NOT NULL,
  interest_rate_pm     NUMERIC(5,2) NOT NULL,
  interest_basis       TEXT NOT NULL,
  interest_paise       BIGINT NOT NULL,
  is_paid              BOOLEAN NOT NULL DEFAULT TRUE,
  paid_on              DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_accrual_loan ON zpn_interest_accruals(loan_id);

-- ─────────────────────────────────────────────────────────────
-- LOAN RENEWALS — tenure extensions, top-ups, refinances
-- Previous terms preserved for audit trail.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_renewals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id                UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  entity_id              UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  customer_id            UUID NOT NULL REFERENCES zpn_customers(id),
  renewal_type           TEXT NOT NULL
                           CHECK (renewal_type IN ('tenure_extension','topup','refinance')),
  renewal_date           DATE NOT NULL,

  prev_sanctioned_paise  BIGINT NOT NULL,
  prev_outstanding_paise BIGINT NOT NULL,
  prev_interest_rate_pm  NUMERIC(5,2) NOT NULL,
  prev_tenure_days       INTEGER NOT NULL,
  prev_maturity_date     DATE NOT NULL,

  new_sanctioned_paise   BIGINT NOT NULL,
  new_interest_rate_pm   NUMERIC(5,2) NOT NULL,
  new_tenure_days        INTEGER NOT NULL,
  new_maturity_date      DATE NOT NULL,

  interest_cleared_paise BIGINT NOT NULL DEFAULT 0,
  penalty_cleared_paise  BIGINT NOT NULL DEFAULT 0,
  renewal_fee_paise      BIGINT NOT NULL DEFAULT 0,
  topup_disbursed_paise  BIGINT NOT NULL DEFAULT 0,
  net_disbursed_paise    BIGINT NOT NULL DEFAULT 0,

  remarks                TEXT,
  created_by             UUID NOT NULL REFERENCES zi_individuals(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_renewals_loan ON zpn_renewals(loan_id);

-- ─────────────────────────────────────────────────────────────
-- LOAN CLOSURES — settlement / closure records
-- Created by the close route; triggers mark loan closed.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_closures (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id                 UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  entity_id               UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  customer_id             UUID NOT NULL REFERENCES zpn_customers(id),
  closure_date            DATE NOT NULL,
  closure_type            TEXT NOT NULL
                            CHECK (closure_type IN ('full_payment','settlement','auction','waiver')),

  outstanding_at_closure  BIGINT NOT NULL,
  interest_at_closure     BIGINT NOT NULL,
  penalty_at_closure      BIGINT NOT NULL DEFAULT 0,
  total_due_paise         BIGINT NOT NULL,
  settlement_paise        BIGINT NOT NULL,
  rebate_paise            BIGINT NOT NULL DEFAULT 0,

  items_released          BOOLEAN NOT NULL DEFAULT FALSE,
  released_at             TIMESTAMPTZ,
  released_by             UUID REFERENCES zi_individuals(id),

  closure_notes           TEXT,
  authorized_by           UUID REFERENCES zi_individuals(id),
  created_by              UUID NOT NULL REFERENCES zi_individuals(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_closures_loan ON zpn_closures(loan_id);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS — counter maintenance (replaces all RPCs)
-- API pre-calculates; triggers keep derived columns in sync.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER tg_zpn_schemes_updated_at
  BEFORE UPDATE ON zpn_schemes   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpn_customers_updated_at
  BEFORE UPDATE ON zpn_customers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpn_tickets_updated_at
  BEFORE UPDATE ON zpn_tickets   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpn_loans_updated_at
  BEFORE UPDATE ON zpn_loans     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Item inserted → ticket.item_count + 1
CREATE OR REPLACE FUNCTION fn_zpn_on_item_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zpn_tickets
  SET item_count = item_count + 1, updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER tg_zpn_item_insert
  AFTER INSERT ON zpn_items FOR EACH ROW EXECUTE FUNCTION fn_zpn_on_item_insert();

-- Valuation inserted → recalculate ticket totals from all latest valuations
CREATE OR REPLACE FUNCTION fn_zpn_on_valuation_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Mark previous valuation for this item as not-latest
  UPDATE zpn_item_valuations
  SET is_latest = FALSE
  WHERE item_id = NEW.item_id AND id <> NEW.id;

  -- Recalculate ticket totals
  UPDATE zpn_tickets
  SET total_appraised_paise = (
        SELECT COALESCE(SUM(net_value_paise), 0)
        FROM zpn_item_valuations
        WHERE ticket_id = NEW.ticket_id AND is_latest = TRUE
      ),
      max_eligible_paise = (
        SELECT COALESCE(SUM(max_loan_paise), 0)
        FROM zpn_item_valuations
        WHERE ticket_id = NEW.ticket_id AND is_latest = TRUE
      ),
      updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER tg_zpn_valuation_insert
  AFTER INSERT ON zpn_item_valuations FOR EACH ROW EXECUTE FUNCTION fn_zpn_on_valuation_insert();

-- Loan inserted → customer.active_loans + total_loans + total_borrowed
CREATE OR REPLACE FUNCTION fn_zpn_on_loan_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zpn_customers
  SET active_loans         = active_loans + 1,
      total_loans          = total_loans + 1,
      total_borrowed_paise = total_borrowed_paise + NEW.sanctioned_paise,
      updated_at           = now()
  WHERE id = NEW.customer_id;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER tg_zpn_loan_insert
  AFTER INSERT ON zpn_loans FOR EACH ROW EXECUTE FUNCTION fn_zpn_on_loan_insert();

-- Payment inserted → update loan running totals using pre-calculated waterfall portions
CREATE OR REPLACE FUNCTION fn_zpn_on_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zpn_loans
  SET outstanding_paise          = NEW.outstanding_after_paise,
      total_interest_paid_paise  = total_interest_paid_paise  + NEW.interest_portion_paise,
      total_principal_paid_paise = total_principal_paid_paise + NEW.principal_portion_paise,
      total_penalty_paid_paise   = total_penalty_paid_paise   + NEW.penalty_portion_paise,
      payment_count              = payment_count + 1,
      last_payment_at            = now(),
      last_interest_paid_date    = CASE
                                     WHEN NEW.interest_portion_paise > 0
                                     THEN NEW.interest_to_date
                                     ELSE last_interest_paid_date
                                   END,
      -- Auto-close when fully paid
      status      = CASE
                      WHEN NEW.outstanding_after_paise <= 0 THEN 'closed'
                      ELSE status
                    END,
      closed_at   = CASE
                      WHEN NEW.outstanding_after_paise <= 0 THEN now()
                      ELSE closed_at
                    END,
      close_reason = CASE
                       WHEN NEW.outstanding_after_paise <= 0 AND close_reason IS NULL
                       THEN 'full_payment'
                       ELSE close_reason
                     END,
      updated_at = now()
  WHERE id = NEW.loan_id;

  UPDATE zpn_customers
  SET total_paid_paise = total_paid_paise + NEW.payment_amount_paise,
      updated_at       = now()
  WHERE id = NEW.customer_id;

  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER tg_zpn_payment_insert
  AFTER INSERT ON zpn_payments FOR EACH ROW EXECUTE FUNCTION fn_zpn_on_payment_insert();

-- Loan status → closed/auctioned/cancelled → decrement customer.active_loans
CREATE OR REPLACE FUNCTION fn_zpn_on_loan_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('closed','auctioned','cancelled') AND
     OLD.status NOT IN ('closed','auctioned','cancelled') THEN
    UPDATE zpn_customers
    SET active_loans = GREATEST(0, active_loans - 1), updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER tg_zpn_loan_status_change
  AFTER UPDATE OF status ON zpn_loans FOR EACH ROW EXECUTE FUNCTION fn_zpn_on_loan_status_change();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — API uses service role (bypasses RLS)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zpn_schemes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_item_valuations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_loans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_ledger            ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_interest_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_renewals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_closures          ENABLE ROW LEVEL SECURITY;

CREATE POLICY zpn_schemes_deny           ON zpn_schemes           FOR ALL USING (false);
CREATE POLICY zpn_customers_deny         ON zpn_customers         FOR ALL USING (false);
CREATE POLICY zpn_tickets_deny           ON zpn_tickets           FOR ALL USING (false);
CREATE POLICY zpn_items_deny             ON zpn_items             FOR ALL USING (false);
CREATE POLICY zpn_item_valuations_deny   ON zpn_item_valuations   FOR ALL USING (false);
CREATE POLICY zpn_loans_deny             ON zpn_loans             FOR ALL USING (false);
CREATE POLICY zpn_payments_deny          ON zpn_payments          FOR ALL USING (false);
CREATE POLICY zpn_ledger_deny            ON zpn_ledger            FOR ALL USING (false);
CREATE POLICY zpn_interest_accruals_deny ON zpn_interest_accruals FOR ALL USING (false);
CREATE POLICY zpn_renewals_deny          ON zpn_renewals          FOR ALL USING (false);
CREATE POLICY zpn_closures_deny          ON zpn_closures          FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZPN', 'zipawn_auctions',      'Auction Management',         '["plus","pro"]'),
  ('ZPN', 'zipawn_sms_reminder',  'Loan Due SMS Reminders',     '["solo","plus","pro"]'),
  ('ZPN', 'zipawn_overdue_scan',  'Daily Overdue Scanner',      '["solo","plus","pro"]'),
  ('ZPN', 'zipawn_bulk_export',   'Bulk Loan Export (CSV)',      '["plus","pro"]'),
  ('ZPN', 'zipawn_renewal',       'Loan Renewal & Top-up',      '["solo","plus","pro"]'),
  ('ZPN', 'zipawn_kyc_strict',    'Strict KYC Gate',            '["solo","plus","pro"]'),
  ('ZPN', 'zipawn_multi_scheme',  'Multiple Loan Schemes',      '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

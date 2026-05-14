-- ZiPawn Database Schema
-- Product: ZPN | All tables scoped by entity_id + subscription_id
-- Run after 004_audit.sql migrations

-- ─────────────────────────────────────────────
-- ZPN Customers  (CST prefix, ref: ZEA01ZPNA01CSTA01)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,     -- CST prefix
  ref_code         TEXT NOT NULL UNIQUE,     -- ZEA01ZPNA01CSTA01
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  full_name        TEXT NOT NULL,
  mobile_hash      TEXT NOT NULL,
  mobile_last4     TEXT NOT NULL,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  country_code     TEXT NOT NULL DEFAULT 'IN',
  national_id_type TEXT,
  national_id_hash TEXT,
  national_id_last6 TEXT,
  kyc_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpn_customers_entity ON zpn_customers(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_customers_mobile ON zpn_customers(mobile_hash);

-- ─────────────────────────────────────────────
-- ZPN Items (pledge/collateral items)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id              UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id        UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  loan_id                UUID,              -- set after loan creation
  category               TEXT NOT NULL,    -- gold | silver | diamond | electronics | vehicle | property_doc | other
  description            TEXT NOT NULL,
  weight_grams           NUMERIC(10,3),
  purity                 TEXT,             -- e.g. 22K, 916, 18K
  appraised_value_paise  BIGINT NOT NULL,
  market_value_paise     BIGINT NOT NULL,
  images                 TEXT[] DEFAULT '{}',  -- R2 object keys
  condition_notes        TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_by             UUID NOT NULL REFERENCES zi_individuals(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpn_items_entity  ON zpn_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_items_loan_id ON zpn_items(loan_id);

-- ─────────────────────────────────────────────
-- ZPN Loans (LN prefix → LN26A01)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_loans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,   -- LN26A01
  ref_code             TEXT NOT NULL UNIQUE,   -- ZEA01ZPNA01LN26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id            UUID NOT NULL REFERENCES zi_branches(id) ON DELETE RESTRICT,
  customer_id          UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,
  principal_paise      BIGINT NOT NULL,
  interest_rate_pct    NUMERIC(6,2) NOT NULL,
  interest_type        TEXT NOT NULL CHECK (interest_type IN ('simple','compound')),
  tenure_months        INTEGER NOT NULL,
  loan_start_date      DATE NOT NULL,
  loan_end_date        DATE NOT NULL,
  total_interest_paise BIGINT NOT NULL DEFAULT 0,
  total_due_paise      BIGINT NOT NULL,
  paid_paise           BIGINT NOT NULL DEFAULT 0,
  outstanding_paise    BIGINT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('pending','active','interest_due','overdue','released','auctioned','written_off')),
  last_interest_date   DATE,
  released_at          TIMESTAMPTZ,
  auctioned_at         TIMESTAMPTZ,
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpn_loans_entity      ON zpn_loans(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_customer    ON zpn_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_status      ON zpn_loans(status);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_end_date    ON zpn_loans(loan_end_date);

-- ─────────────────────────────────────────────
-- ZPN Payments (PAY prefix → PAY26A01)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpn_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  loan_id          UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  customer_id      UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,
  amount_paise     BIGINT NOT NULL,
  principal_paise  BIGINT NOT NULL DEFAULT 0,
  interest_paise   BIGINT NOT NULL DEFAULT 0,
  payment_date     DATE NOT NULL,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('cash','upi','neft','rtgs','cheque')),
  receipt_number   TEXT,
  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpn_payments_entity ON zpn_payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_payments_loan   ON zpn_payments(loan_id);

-- Updated_at trigger helper (reuse if already exists)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER tg_zpn_customers_updated_at
  BEFORE UPDATE ON zpn_customers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER tg_zpn_loans_updated_at
  BEFORE UPDATE ON zpn_loans
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

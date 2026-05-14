-- ============================================================
-- Ziort — Migration 019: ZiLedger (Full GST Accounting)
-- Product code: ZLDG  |  Table prefix: zlg_
-- Tagline: Every debit, every credit. GST-ready books.
-- Run after: 018_zifood.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Chart of accounts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zlg_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL,                    -- ACC001
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  name                 TEXT NOT NULL,
  account_type         TEXT NOT NULL
                         CHECK (account_type IN (
                           'ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'
                         )),
  account_group        TEXT,                             -- Cash, Bank, Receivable, Payable, etc.
  parent_id            UUID REFERENCES zlg_accounts(id),
  opening_balance      BIGINT NOT NULL DEFAULT 0,        -- in paise (signed; negative = credit)
  current_balance      BIGINT NOT NULL DEFAULT 0,        -- maintained by trigger
  is_system            BOOLEAN NOT NULL DEFAULT false,   -- system accounts can't be deleted
  is_active            BOOLEAN NOT NULL DEFAULT true,
  description          TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entity_id, zi_code)
);

CREATE INDEX IF NOT EXISTS idx_zlg_accounts_entity ON zlg_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_zlg_accounts_type   ON zlg_accounts(account_type);

-- ─────────────────────────────────────────────────────────────
-- Journal vouchers (double-entry header)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zlg_vouchers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- VCH26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  voucher_type         TEXT NOT NULL
                         CHECK (voucher_type IN (
                           'JOURNAL','PAYMENT','RECEIPT','CONTRA',
                           'SALES','PURCHASE','DEBIT_NOTE','CREDIT_NOTE'
                         )),
  voucher_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  narration            TEXT,
  reference_number     TEXT,                             -- cheque no., invoice no., etc.
  total_debit_paise    BIGINT NOT NULL DEFAULT 0,
  total_credit_paise   BIGINT NOT NULL DEFAULT 0,

  -- GST fields (for Sales/Purchase vouchers)
  supply_type          TEXT CHECK (supply_type IN ('INTRASTATE','INTERSTATE')),
  gstin_party          TEXT,
  taxable_amount_paise BIGINT,
  cgst_paise           BIGINT,
  sgst_paise           BIGINT,
  igst_paise           BIGINT,
  gst_return_period    TEXT,                             -- '2026-04' (YYYY-MM) for GSTR filing

  status               TEXT NOT NULL DEFAULT 'POSTED'
                         CHECK (status IN ('DRAFT','POSTED','CANCELLED')),
  cancelled_at         TIMESTAMPTZ,
  cancel_reason        TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zlg_vouchers_entity  ON zlg_vouchers(entity_id);
CREATE INDEX IF NOT EXISTS idx_zlg_vouchers_date    ON zlg_vouchers(voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_zlg_vouchers_type    ON zlg_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_zlg_vouchers_period  ON zlg_vouchers(gst_return_period);

-- ─────────────────────────────────────────────────────────────
-- Voucher lines (debit / credit entries)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zlg_voucher_lines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id           UUID NOT NULL REFERENCES zlg_vouchers(id) ON DELETE CASCADE,
  account_id           UUID NOT NULL REFERENCES zlg_accounts(id) ON DELETE RESTRICT,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  entry_type           TEXT NOT NULL CHECK (entry_type IN ('DEBIT','CREDIT')),
  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  narration            TEXT,
  sort_order           INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zlg_lines_voucher ON zlg_voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_zlg_lines_account ON zlg_voucher_lines(account_id);

-- ─────────────────────────────────────────────────────────────
-- Trigger: update account.current_balance on voucher_line insert
-- Debit increases assets/expenses; Credit increases liabilities/equity/income
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_zlg_on_line_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT account_type INTO v_type FROM zlg_accounts WHERE id = NEW.account_id;
  -- Normal balance convention:
  -- Assets & Expenses: debit increases (+), credit decreases (-)
  -- Liabilities, Equity, Income: credit increases (+), debit decreases (-)
  IF v_type IN ('ASSET','EXPENSE') THEN
    UPDATE zlg_accounts SET current_balance = current_balance +
      CASE WHEN NEW.entry_type = 'DEBIT' THEN NEW.amount_paise ELSE -NEW.amount_paise END,
      updated_at = now()
    WHERE id = NEW.account_id;
  ELSE
    UPDATE zlg_accounts SET current_balance = current_balance +
      CASE WHEN NEW.entry_type = 'CREDIT' THEN NEW.amount_paise ELSE -NEW.amount_paise END,
      updated_at = now()
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zlg_line_insert
  AFTER INSERT ON zlg_voucher_lines
  FOR EACH ROW EXECUTE FUNCTION fn_zlg_on_line_insert();

-- ─────────────────────────────────────────────────────────────
-- GST return tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zlg_gst_returns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  return_type          TEXT NOT NULL
                         CHECK (return_type IN ('GSTR1','GSTR3B','GSTR2A','GSTR9')),
  return_period        TEXT NOT NULL,                    -- '2026-04'
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','FILED','REVISED')),
  filed_at             TIMESTAMPTZ,
  arn_number           TEXT,                             -- Acknowledgement Reference Number
  total_taxable_paise  BIGINT NOT NULL DEFAULT 0,
  total_cgst_paise     BIGINT NOT NULL DEFAULT 0,
  total_sgst_paise     BIGINT NOT NULL DEFAULT 0,
  total_igst_paise     BIGINT NOT NULL DEFAULT 0,
  total_tax_paise      BIGINT NOT NULL DEFAULT 0,

  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entity_id, return_type, return_period)
);

CREATE INDEX IF NOT EXISTS idx_zlg_gst_returns_entity ON zlg_gst_returns(entity_id);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zlg_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zlg_vouchers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zlg_voucher_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE zlg_gst_returns   ENABLE ROW LEVEL SECURITY;

CREATE POLICY zlg_accounts_deny      ON zlg_accounts      FOR ALL USING (false);
CREATE POLICY zlg_vouchers_deny      ON zlg_vouchers      FOR ALL USING (false);
CREATE POLICY zlg_lines_deny         ON zlg_voucher_lines FOR ALL USING (false);
CREATE POLICY zlg_gst_returns_deny   ON zlg_gst_returns   FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZLDG', 'ziledger_journal',    'Journal Vouchers',         '["plus","pro"]'),
  ('ZLDG', 'ziledger_gst',        'GST Return Tracking',      '["plus","pro"]'),
  ('ZLDG', 'ziledger_coa',        'Chart of Accounts',        '["plus","pro"]'),
  ('ZLDG', 'ziledger_reports',    'Balance Sheet & P&L',      '["pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

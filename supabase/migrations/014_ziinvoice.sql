-- ============================================================
-- Ziort — Migration 014: ZiInvoice (Tax Invoice Engine)
-- Product code: ZNVC  |  Table prefix: znvc_
-- Tagline: Bill right. Get paid faster.
-- Run after: 013_ziquote.sql
--
-- Full GST tax invoice with payment tracking. Invoices can
-- originate from a ZiQuote. Payments trigger status updates.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ZNVC Settings — entity-level invoice configuration
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znvc_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id     UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  invoice_prefix      TEXT DEFAULT '',                    -- e.g. "INV/" → "INV/26A01"
  default_due_days    INTEGER NOT NULL DEFAULT 30 CHECK (default_due_days >= 0),
  default_terms       TEXT,
  default_footer      TEXT,
  logo_url            TEXT,
  signature_url       TEXT,

  -- Bank details printed on invoice
  bank_name           TEXT,
  account_number      TEXT,
  ifsc                TEXT,
  upi_id              TEXT,
  payment_qr_url      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER tg_znvc_settings_updated_at
  BEFORE UPDATE ON znvc_settings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ZNVC Invoices — the invoice header
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znvc_invoices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- INV26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id            UUID REFERENCES zi_branches(id),

  -- Origin
  quote_id             UUID REFERENCES zqt_quotes(id),   -- if converted from a quote

  -- Invoice type
  invoice_type         TEXT NOT NULL DEFAULT 'TAX_INVOICE'
                         CHECK (invoice_type IN (
                           'TAX_INVOICE','PROFORMA','CREDIT_NOTE','DEBIT_NOTE'
                         )),

  -- Customer info (snapshot)
  customer_name        TEXT NOT NULL,
  customer_gstin       TEXT CHECK (customer_gstin ~ '^[0-9A-Z]{15}$' OR customer_gstin IS NULL),
  customer_address     TEXT,
  customer_city        TEXT,
  customer_state       TEXT,
  customer_email       TEXT,
  customer_mobile      TEXT,
  contact_id           UUID,

  -- Dates
  invoice_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date             DATE,

  -- GST
  place_of_supply      TEXT,                              -- state name or code
  supply_type          TEXT NOT NULL DEFAULT 'INTRASTATE'
                         CHECK (supply_type IN ('INTRASTATE','INTERSTATE')),

  -- Content
  subject              TEXT,
  notes                TEXT,
  terms                TEXT,
  footer               TEXT,

  -- Lifecycle
  status               TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN (
                           'DRAFT','SENT','VIEWED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'
                         )),
  sent_at              TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancel_reason        TEXT,

  -- Totals (recalculated by API on every item change)
  subtotal_paise       BIGINT NOT NULL DEFAULT 0,
  total_discount_paise BIGINT NOT NULL DEFAULT 0,
  total_cgst_paise     BIGINT NOT NULL DEFAULT 0,
  total_sgst_paise     BIGINT NOT NULL DEFAULT 0,
  total_igst_paise     BIGINT NOT NULL DEFAULT 0,
  total_gst_paise      BIGINT NOT NULL DEFAULT 0,
  grand_total_paise    BIGINT NOT NULL DEFAULT 0,
  amount_words         TEXT,

  -- Payment tracking (trigger-maintained)
  amount_paid_paise    BIGINT NOT NULL DEFAULT 0,
  amount_due_paise     BIGINT NOT NULL DEFAULT 0,        -- grand_total - amount_paid

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_znvc_invoices_entity   ON znvc_invoices(entity_id);
CREATE INDEX IF NOT EXISTS idx_znvc_invoices_sub      ON znvc_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_znvc_invoices_status   ON znvc_invoices(status);
CREATE INDEX IF NOT EXISTS idx_znvc_invoices_date     ON znvc_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_znvc_invoices_due      ON znvc_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_znvc_invoices_quote    ON znvc_invoices(quote_id);

-- ─────────────────────────────────────────────────────────────
-- ZNVC Items — line items (same GST-aware structure as ZiQuote)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znvc_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           UUID NOT NULL REFERENCES znvc_invoices(id) ON DELETE CASCADE,

  sort_order           INTEGER NOT NULL DEFAULT 0,
  description          TEXT NOT NULL CHECK (char_length(description) <= 500),
  hsn_sac              TEXT CHECK (char_length(hsn_sac) <= 20),
  qty                  NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit                 TEXT CHECK (char_length(unit) <= 30),
  rate_paise           BIGINT NOT NULL CHECK (rate_paise >= 0),

  discount_pct         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  discount_paise       BIGINT NOT NULL DEFAULT 0,
  gross_amount_paise   BIGINT NOT NULL DEFAULT 0,
  taxable_amount_paise BIGINT NOT NULL DEFAULT 0,

  gst_rate_pct         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate_pct >= 0 AND gst_rate_pct <= 28),
  cgst_paise           BIGINT NOT NULL DEFAULT 0,
  sgst_paise           BIGINT NOT NULL DEFAULT 0,
  igst_paise           BIGINT NOT NULL DEFAULT 0,
  total_paise          BIGINT NOT NULL DEFAULT 0,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_znvc_items_invoice ON znvc_items(invoice_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- ZNVC Payments — payment receipts against an invoice
-- Trigger auto-updates amount_paid_paise and status on znvc_invoices.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znvc_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES znvc_invoices(id) ON DELETE RESTRICT,
  amount_paise     BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode     TEXT NOT NULL DEFAULT 'CASH'
                     CHECK (payment_mode IN (
                       'CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'
                     )),
  reference_number TEXT,                              -- UPI txn ID, cheque number, etc.
  note             TEXT,
  receipt_id       UUID,                              -- FK to zrcp_receipts — set after receipt created
  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_znvc_payments_invoice ON znvc_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_znvc_payments_date    ON znvc_payments(payment_date DESC);

-- ─────────────────────────────────────────────────────────────
-- Trigger: payment insert → update invoice paid amount + status
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_znvc_on_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_paid        BIGINT;
  v_grand_total BIGINT;
  v_new_status  TEXT;
BEGIN
  SELECT COALESCE(SUM(amount_paise), 0) INTO v_paid
  FROM znvc_payments WHERE invoice_id = NEW.invoice_id;

  SELECT grand_total_paise INTO v_grand_total
  FROM znvc_invoices WHERE id = NEW.invoice_id;

  IF v_paid >= v_grand_total THEN
    v_new_status := 'PAID';
  ELSE
    v_new_status := 'PARTIALLY_PAID';
  END IF;

  UPDATE znvc_invoices
  SET amount_paid_paise = v_paid,
      amount_due_paise  = GREATEST(0, v_grand_total - v_paid),
      status            = v_new_status,
      updated_at        = now()
  WHERE id = NEW.invoice_id
    AND status NOT IN ('CANCELLED','DRAFT');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_znvc_payment_insert
  AFTER INSERT ON znvc_payments
  FOR EACH ROW EXECUTE FUNCTION fn_znvc_on_payment_insert();

-- ─────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER tg_znvc_invoices_updated_at
  BEFORE UPDATE ON znvc_invoices FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_znvc_items_updated_at
  BEFORE UPDATE ON znvc_items    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE znvc_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE znvc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE znvc_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE znvc_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY znvc_settings_deny_all ON znvc_settings FOR ALL USING (false);
CREATE POLICY znvc_invoices_deny_all ON znvc_invoices FOR ALL USING (false);
CREATE POLICY znvc_items_deny_all    ON znvc_items    FOR ALL USING (false);
CREATE POLICY znvc_payments_deny_all ON znvc_payments FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZNVC', 'ziinvoice_unlimited',   'Unlimited Invoices',        '["plus","pro"]'),
  ('ZNVC', 'ziinvoice_credit_note', 'Credit & Debit Notes',      '["plus","pro"]'),
  ('ZNVC', 'ziinvoice_branding',    'Custom Logo & Bank Details','["solo","plus","pro"]'),
  ('ZNVC', 'ziinvoice_overdue',     'Overdue Auto-alerts',       '["plus","pro"]'),
  ('ZNVC', 'ziinvoice_from_quote',  'Convert from ZiQuote',      '["solo","plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

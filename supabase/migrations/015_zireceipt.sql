-- ============================================================
-- Ziort — Migration 015: ZiReceipt (Receipt Management)
-- Product code: ZRCP  |  Table prefix: zrcp_
-- Tagline: Every payment acknowledged. Every rupee traceable.
-- Run after: 014_ziinvoice.sql
--
-- Receipts can be:
--   1. Auto-created from ZiInvoice payment recording (linked)
--   2. Standalone — for cash received without an invoice (advance,
--      walk-in purchase, refund acknowledgement, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS zrcp_receipts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- RCP26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id            UUID REFERENCES zi_branches(id),

  -- Receipt type
  receipt_type         TEXT NOT NULL DEFAULT 'ADVANCE'
                         CHECK (receipt_type IN (
                           'INVOICE_PAYMENT','ADVANCE','REFUND','SECURITY_DEPOSIT','OTHER'
                         )),

  -- Back-links (set when auto-created from invoice payment)
  invoice_id           UUID REFERENCES znvc_invoices(id),
  invoice_payment_id   UUID REFERENCES znvc_payments(id),

  -- Payer details (snapshot)
  payer_name           TEXT NOT NULL,
  payer_mobile         TEXT,
  payer_gstin          TEXT,
  payer_address        TEXT,
  contact_id           UUID,                              -- optional ZiPulse contact ref

  -- Transaction
  receipt_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_mode         TEXT NOT NULL DEFAULT 'CASH'
                         CHECK (payment_mode IN (
                           'CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'
                         )),
  reference_number     TEXT,                              -- UPI ref, cheque number, etc.
  purpose              TEXT CHECK (char_length(purpose) <= 300),
  notes                TEXT,
  amount_words         TEXT,                              -- computed by API

  -- Lifecycle
  status               TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','CANCELLED')),
  cancelled_at         TIMESTAMPTZ,
  cancel_reason        TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zrcp_receipts_entity   ON zrcp_receipts(entity_id);
CREATE INDEX IF NOT EXISTS idx_zrcp_receipts_sub      ON zrcp_receipts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zrcp_receipts_status   ON zrcp_receipts(status);
CREATE INDEX IF NOT EXISTS idx_zrcp_receipts_date     ON zrcp_receipts(receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_zrcp_receipts_invoice  ON zrcp_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_zrcp_receipts_type     ON zrcp_receipts(receipt_type);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zrcp_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY zrcp_receipts_deny_all ON zrcp_receipts FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZRCP', 'zireceipt_standalone',   'Standalone Receipts',         '["solo","plus","pro"]'),
  ('ZRCP', 'zireceipt_auto_from_inv','Auto Receipt on Invoice Pay',  '["solo","plus","pro"]'),
  ('ZRCP', 'zireceipt_branding',     'Custom Logo & Branding',       '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

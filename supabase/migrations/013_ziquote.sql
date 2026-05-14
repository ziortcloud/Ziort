-- ============================================================
-- Ziort — Migration 013: ZiQuote (Quotation Management)
-- Product code: ZQT  |  Table prefix: zqt_
-- Tagline: Quote smarter. Win faster.
-- Run after: 012_zicalc.sql
--
-- Full GST-aware quotation engine. Quotes can originate from
-- a ZiCalc sheet and convert to ZiInvoice on acceptance.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ZQT Settings — entity-level quote configuration
-- One record per entity subscription; upserted via API.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zqt_settings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id              UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id        UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  -- Display
  default_validity_days  INTEGER NOT NULL DEFAULT 30 CHECK (default_validity_days > 0),
  default_terms          TEXT,
  default_footer         TEXT,
  default_notes          TEXT,
  logo_url               TEXT,
  signature_url          TEXT,

  -- Payment details shown on quote
  bank_name              TEXT,
  account_number         TEXT,
  ifsc                   TEXT,
  upi_id                 TEXT,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER tg_zqt_settings_updated_at
  BEFORE UPDATE ON zqt_settings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ZQT Quotes — the quote header
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zqt_quotes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- QT26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id            UUID REFERENCES zi_branches(id),

  -- Customer info (snapshot at quote time)
  customer_name        TEXT NOT NULL,
  customer_gstin       TEXT CHECK (customer_gstin ~ '^[0-9A-Z]{15}$' OR customer_gstin IS NULL),
  customer_address     TEXT,
  customer_city        TEXT,
  customer_state       TEXT,
  customer_email       TEXT,
  customer_mobile      TEXT,
  contact_id           UUID,                              -- optional ZiPulse contact ref

  -- Document
  quote_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until          DATE,
  subject              TEXT CHECK (char_length(subject) <= 300),
  notes                TEXT,
  terms                TEXT,
  footer               TEXT,

  -- GST classification
  supply_type          TEXT NOT NULL DEFAULT 'INTRASTATE'
                         CHECK (supply_type IN ('INTRASTATE','INTERSTATE')),

  -- Origin
  calc_sheet_id        UUID REFERENCES zclc_sheets(id),

  -- Lifecycle
  status               TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN (
                           'DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','CONVERTED'
                         )),
  sent_at              TIMESTAMPTZ,
  viewed_at            TIMESTAMPTZ,
  accepted_at          TIMESTAMPTZ,
  rejected_at          TIMESTAMPTZ,
  rejection_note       TEXT,
  converted_invoice_id UUID,                              -- set after convert → ZiInvoice

  -- Totals — recalculated by API on every item change
  subtotal_paise       BIGINT NOT NULL DEFAULT 0,
  total_discount_paise BIGINT NOT NULL DEFAULT 0,
  total_cgst_paise     BIGINT NOT NULL DEFAULT 0,
  total_sgst_paise     BIGINT NOT NULL DEFAULT 0,
  total_igst_paise     BIGINT NOT NULL DEFAULT 0,
  total_gst_paise      BIGINT NOT NULL DEFAULT 0,
  grand_total_paise    BIGINT NOT NULL DEFAULT 0,
  amount_words         TEXT,                              -- "Rupees X and Y Paise Only"

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zqt_quotes_entity  ON zqt_quotes(entity_id);
CREATE INDEX IF NOT EXISTS idx_zqt_quotes_sub     ON zqt_quotes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zqt_quotes_status  ON zqt_quotes(status);
CREATE INDEX IF NOT EXISTS idx_zqt_quotes_date    ON zqt_quotes(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_zqt_quotes_valid   ON zqt_quotes(valid_until);

-- ─────────────────────────────────────────────────────────────
-- ZQT Items — line items on a quote (GST-aware)
-- All monetary values computed by API before insert.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zqt_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id             UUID NOT NULL REFERENCES zqt_quotes(id) ON DELETE CASCADE,

  sort_order           INTEGER NOT NULL DEFAULT 0,
  description          TEXT NOT NULL CHECK (char_length(description) <= 500),
  hsn_sac              TEXT CHECK (char_length(hsn_sac) <= 20),
  qty                  NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit                 TEXT CHECK (char_length(unit) <= 30),
  rate_paise           BIGINT NOT NULL CHECK (rate_paise >= 0),

  -- Discount
  discount_pct         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  discount_paise       BIGINT NOT NULL DEFAULT 0,

  -- Computed amounts (API sets these before insert)
  gross_amount_paise   BIGINT NOT NULL DEFAULT 0,
  taxable_amount_paise BIGINT NOT NULL DEFAULT 0,

  -- GST
  gst_rate_pct         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate_pct >= 0 AND gst_rate_pct <= 28),
  cgst_paise           BIGINT NOT NULL DEFAULT 0,
  sgst_paise           BIGINT NOT NULL DEFAULT 0,
  igst_paise           BIGINT NOT NULL DEFAULT 0,

  -- Line total
  total_paise          BIGINT NOT NULL DEFAULT 0,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zqt_items_quote ON zqt_items(quote_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER tg_zqt_quotes_updated_at
  BEFORE UPDATE ON zqt_quotes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zqt_items_updated_at
  BEFORE UPDATE ON zqt_items  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zqt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zqt_quotes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE zqt_items    ENABLE ROW LEVEL SECURITY;

CREATE POLICY zqt_settings_deny_all ON zqt_settings FOR ALL USING (false);
CREATE POLICY zqt_quotes_deny_all   ON zqt_quotes   FOR ALL USING (false);
CREATE POLICY zqt_items_deny_all    ON zqt_items    FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZQT', 'ziquote_unlimited',    'Unlimited Quotes',          '["plus","pro"]'),
  ('ZQT', 'ziquote_convert',      'Convert Quote to Invoice',  '["solo","plus","pro"]'),
  ('ZQT', 'ziquote_branding',     'Custom Logo & Signature',   '["plus","pro"]'),
  ('ZQT', 'ziquote_from_calc',    'Create from ZiCalc Sheet',  '["solo","plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

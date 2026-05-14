-- ============================================================
-- Ziort — Migration 012: ZiCalc (Cost Sheet & Price Calculator)
-- Product code: ZCLC  |  Table prefix: zclc_
-- Tagline: Know your cost before you quote.
-- Run after: 011_zidriver.sql
--
-- ZiCalc lets a business create named cost sheets — add material,
-- labour, and overhead items, set a margin, and instantly see the
-- recommended selling price. Sheets can be promoted to ZiQuote.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ZCLC Sheets — named cost estimation workbooks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zclc_sheets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- EST26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  name                 TEXT NOT NULL CHECK (char_length(name) <= 200),
  description          TEXT,
  category             TEXT NOT NULL DEFAULT 'custom'
                         CHECK (category IN ('product_costing','project_estimate','service_pricing','custom')),
  currency             TEXT NOT NULL DEFAULT 'INR',

  -- Margin controls selling price
  margin_pct           NUMERIC(6,2) NOT NULL DEFAULT 20.00 CHECK (margin_pct >= 0),

  -- Computed totals — recalculated by API on every item change
  subtotal_paise       BIGINT NOT NULL DEFAULT 0,           -- sum of all item costs
  selling_price_paise  BIGINT NOT NULL DEFAULT 0,           -- subtotal × (1 + margin/100)
  profit_paise         BIGINT NOT NULL DEFAULT 0,           -- selling_price - subtotal

  -- Lifecycle
  is_archived          BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at          TIMESTAMPTZ,

  -- Optional link to quote created from this sheet
  converted_quote_id   UUID,                                -- set when sheet is promoted to Quote

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zclc_sheets_entity   ON zclc_sheets(entity_id);
CREATE INDEX IF NOT EXISTS idx_zclc_sheets_sub      ON zclc_sheets(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zclc_sheets_archived ON zclc_sheets(is_archived);

-- ─────────────────────────────────────────────────────────────
-- ZCLC Items — cost components on a sheet
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zclc_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id      UUID NOT NULL REFERENCES zclc_sheets(id) ON DELETE CASCADE,

  description   TEXT NOT NULL CHECK (char_length(description) <= 300),
  category      TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('material','labour','overhead','subcontract','other')),
  qty           NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit          TEXT CHECK (char_length(unit) <= 30),           -- pcs, kg, hrs, sqft, etc.
  rate_paise    BIGINT NOT NULL CHECK (rate_paise >= 0),
  total_paise   BIGINT NOT NULL DEFAULT 0,                       -- round(qty × rate_paise), API-computed

  sort_order    INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zclc_items_sheet ON zclc_items(sheet_id);

-- ─────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER tg_zclc_sheets_updated_at
  BEFORE UPDATE ON zclc_sheets FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zclc_items_updated_at
  BEFORE UPDATE ON zclc_items  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — deny all; API uses service role
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zclc_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE zclc_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY zclc_sheets_deny_all ON zclc_sheets FOR ALL USING (false);
CREATE POLICY zclc_items_deny_all  ON zclc_items  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZCLC', 'zicalc_unlimited_sheets', 'Unlimited Cost Sheets',   '["plus","pro"]'),
  ('ZCLC', 'zicalc_quote_export',     'Export Sheet to ZiQuote', '["solo","plus","pro"]'),
  ('ZCLC', 'zicalc_categories',       'Category Breakdown Chart','["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

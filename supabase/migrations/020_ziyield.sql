-- ============================================================
-- Ziort — Migration 020: ZiYield (Farm & Agriculture Management)
-- Product code: ZYLD  |  Table prefix: zyl_
-- Tagline: Sow smart. Harvest more. Sell better.
-- Run after: 019_ziledger.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS zyl_farms (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- FRMA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  location             TEXT,
  area_acres           NUMERIC(10,3),
  soil_type            TEXT,
  water_source         TEXT CHECK (water_source IN ('RAIN','BOREWELL','CANAL','DRIP','OTHER')),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zyl_crops (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- CRPA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  farm_id              UUID NOT NULL REFERENCES zyl_farms(id) ON DELETE CASCADE,
  crop_name            TEXT NOT NULL,
  variety              TEXT,
  season               TEXT CHECK (season IN ('KHARIF','RABI','ZAID','PERENNIAL')),
  sowing_date          DATE,
  expected_harvest_date DATE,
  actual_harvest_date  DATE,
  area_acres           NUMERIC(10,3),
  expected_yield_kg    NUMERIC(12,3),
  actual_yield_kg      NUMERIC(12,3),
  status               TEXT NOT NULL DEFAULT 'GROWING'
                         CHECK (status IN ('GROWING','HARVESTED','FAILED','SOLD')),
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zyl_crops_farm    ON zyl_crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_zyl_crops_status  ON zyl_crops(status);

CREATE TABLE IF NOT EXISTS zyl_expenses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  farm_id              UUID NOT NULL REFERENCES zyl_farms(id) ON DELETE CASCADE,
  crop_id              UUID REFERENCES zyl_crops(id),
  expense_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  category             TEXT NOT NULL
                         CHECK (category IN ('SEED','FERTILIZER','PESTICIDE','LABOUR','IRRIGATION','EQUIPMENT','TRANSPORT','OTHER')),
  description          TEXT NOT NULL,
  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_mode         TEXT NOT NULL DEFAULT 'CASH'
                         CHECK (payment_mode IN ('CASH','UPI','BANK','OTHER')),
  reference_number     TEXT,
  vendor_name          TEXT,
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zyl_expenses_farm ON zyl_expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_zyl_expenses_crop ON zyl_expenses(crop_id);

CREATE TABLE IF NOT EXISTS zyl_produce_sales (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- PRDS26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  farm_id              UUID NOT NULL REFERENCES zyl_farms(id) ON DELETE CASCADE,
  crop_id              UUID REFERENCES zyl_crops(id),
  sale_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  buyer_name           TEXT NOT NULL,
  buyer_type           TEXT CHECK (buyer_type IN ('MANDI','WHOLESALE','RETAIL','DIRECT','EXPORT','OTHER')),
  qty_kg               NUMERIC(12,3) NOT NULL CHECK (qty_kg > 0),
  rate_per_kg_paise    BIGINT NOT NULL CHECK (rate_per_kg_paise > 0),
  total_amount_paise   BIGINT NOT NULL,
  transportation_paise BIGINT NOT NULL DEFAULT 0,
  net_amount_paise     BIGINT NOT NULL,
  payment_mode         TEXT NOT NULL DEFAULT 'CASH'
                         CHECK (payment_mode IN ('CASH','UPI','BANK','OTHER')),
  reference_number     TEXT,
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zyl_sales_farm ON zyl_produce_sales(farm_id);
CREATE INDEX IF NOT EXISTS idx_zyl_sales_crop ON zyl_produce_sales(crop_id);

ALTER TABLE zyl_farms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zyl_crops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zyl_expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zyl_produce_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY zyl_farms_deny   ON zyl_farms         FOR ALL USING (false);
CREATE POLICY zyl_crops_deny   ON zyl_crops         FOR ALL USING (false);
CREATE POLICY zyl_expenses_deny ON zyl_expenses     FOR ALL USING (false);
CREATE POLICY zyl_sales_deny   ON zyl_produce_sales FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZYLD', 'ziyield_farm_mgmt',  'Farm Management',          '["solo","plus","pro"]'),
  ('ZYLD', 'ziyield_crop_track', 'Crop Tracking',            '["solo","plus","pro"]'),
  ('ZYLD', 'ziyield_expenses',   'Farm Expense Ledger',      '["solo","plus","pro"]'),
  ('ZYLD', 'ziyield_mandi',      'Mandi & Produce Sales',    '["solo","plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

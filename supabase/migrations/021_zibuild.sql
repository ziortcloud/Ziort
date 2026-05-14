-- ============================================================
-- Ziort — Migration 021: ZiBuild (Construction Material Marketplace)
-- Product code: ZBLD  |  Table prefix: zbd_
-- Tagline: Source it. Price it. Deliver it.
-- Run after: 020_ziyield.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS zbd_listings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- BLDA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  listing_type         TEXT NOT NULL DEFAULT 'SELL'
                         CHECK (listing_type IN ('SELL','BUY','RENT')),
  category             TEXT NOT NULL
                         CHECK (category IN (
                           'CEMENT','STEEL','BRICKS','SAND','AGGREGATE','TIMBER',
                           'TILES','PAINT','PLUMBING','ELECTRICAL','GLASS','TOOLS',
                           'HEAVY_EQUIPMENT','SCAFFOLDING','OTHER'
                         )),
  title                TEXT NOT NULL,
  description          TEXT,
  brand                TEXT,
  grade                TEXT,
  unit                 TEXT NOT NULL DEFAULT 'KG'
                         CHECK (unit IN ('KG','TON','BAGS','PCS','SFT','CFT','METER','LITRE','UNIT','OTHER')),
  qty_available        NUMERIC(14,3),
  rate_paise           BIGINT NOT NULL CHECK (rate_paise > 0),
  min_order_qty        NUMERIC(14,3),
  delivery_available   BOOLEAN NOT NULL DEFAULT false,
  delivery_charge_paise BIGINT,
  location_city        TEXT,
  location_state       TEXT,
  images               TEXT[],
  status               TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','SOLD','EXPIRED','PAUSED')),
  expires_at           TIMESTAMPTZ,

  contact_name         TEXT,
  contact_mobile       TEXT,
  gstin                TEXT,

  view_count           INT NOT NULL DEFAULT 0,
  enquiry_count        INT NOT NULL DEFAULT 0,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zbd_listings_entity   ON zbd_listings(entity_id);
CREATE INDEX IF NOT EXISTS idx_zbd_listings_status   ON zbd_listings(status);
CREATE INDEX IF NOT EXISTS idx_zbd_listings_category ON zbd_listings(category);
CREATE INDEX IF NOT EXISTS idx_zbd_listings_city     ON zbd_listings(location_city);

CREATE TABLE IF NOT EXISTS zbd_enquiries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id           UUID NOT NULL REFERENCES zbd_listings(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  enquirer_entity_id   UUID NOT NULL REFERENCES zi_entities(id),
  enquirer_name        TEXT NOT NULL,
  enquirer_mobile      TEXT,
  qty_needed           NUMERIC(14,3),
  message              TEXT,
  status               TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('OPEN','RESPONDED','CLOSED')),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zbd_enquiries_listing ON zbd_enquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_zbd_enquiries_enquirer ON zbd_enquiries(enquirer_entity_id);

-- Trigger: increment enquiry_count on listing
CREATE OR REPLACE FUNCTION fn_zbd_on_enquiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zbd_listings SET enquiry_count = enquiry_count + 1, updated_at = now()
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zbd_enquiry
  AFTER INSERT ON zbd_enquiries
  FOR EACH ROW EXECUTE FUNCTION fn_zbd_on_enquiry();

ALTER TABLE zbd_listings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zbd_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY zbd_listings_deny  ON zbd_listings  FOR ALL USING (false);
CREATE POLICY zbd_enquiries_deny ON zbd_enquiries FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZBLD', 'zibuild_listings',  'Material Listings',        '["solo","plus","pro"]'),
  ('ZBLD', 'zibuild_enquiries', 'Buyer Enquiries',          '["solo","plus","pro"]'),
  ('ZBLD', 'zibuild_verified',  'Verified Seller Badge',    '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

-- ============================================================
-- Ziort — Migration 022: ZiPost (Free Classifieds & Buy/Sell Ads)
-- Product code: ZPST  |  Table prefix: zps_
-- Tagline: Post it free. Sell it fast.
-- Run after: 021_zibuild.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS zps_ads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- PSTA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  ad_type              TEXT NOT NULL DEFAULT 'SELL'
                         CHECK (ad_type IN ('SELL','BUY','RENT','SERVICE','JOB','MATRIMONY','OTHER')),
  category             TEXT NOT NULL,
  title                TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description          TEXT CHECK (char_length(description) <= 2000),
  price_paise          BIGINT,                            -- null = price on request
  is_negotiable        BOOLEAN NOT NULL DEFAULT false,
  condition            TEXT CHECK (condition IN ('NEW','LIKE_NEW','GOOD','FAIR','FOR_PARTS')),
  images               TEXT[],

  location_city        TEXT,
  location_state       TEXT,
  location_pincode     TEXT,

  contact_name         TEXT NOT NULL,
  contact_mobile_hash  TEXT,
  contact_mobile_last4 TEXT,
  contact_email        TEXT,

  status               TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','SOLD','EXPIRED','REMOVED')),
  is_featured          BOOLEAN NOT NULL DEFAULT false,
  expires_at           TIMESTAMPTZ,

  view_count           INT NOT NULL DEFAULT 0,
  contact_view_count   INT NOT NULL DEFAULT 0,           -- how many revealed the contact

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zps_ads_entity   ON zps_ads(entity_id);
CREATE INDEX IF NOT EXISTS idx_zps_ads_status   ON zps_ads(status);
CREATE INDEX IF NOT EXISTS idx_zps_ads_category ON zps_ads(category);
CREATE INDEX IF NOT EXISTS idx_zps_ads_city     ON zps_ads(location_city);
CREATE INDEX IF NOT EXISTS idx_zps_ads_type     ON zps_ads(ad_type);

-- Public browse (no entity filter) — full text search support
CREATE INDEX IF NOT EXISTS idx_zps_ads_title ON zps_ads USING gin(to_tsvector('english', title));

ALTER TABLE zps_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY zps_ads_deny ON zps_ads FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZPST', 'zipost_post_ad',    'Post Classified Ads',      '["solo","plus","pro"]'),
  ('ZPST', 'zipost_featured',   'Featured Ad Boost',        '["plus","pro"]'),
  ('ZPST', 'zipost_analytics',  'Ad View Analytics',        '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

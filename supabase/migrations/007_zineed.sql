-- ============================================================
-- Ziort — Migration 007: ZiNeed (B2B Marketplace)
-- Product code: ZND
-- Run after: 006_zipulse.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ZND Requirements — what a buyer needs (REQ prefix → REQ26A01)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znd_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL UNIQUE,
  ref_code          TEXT NOT NULL UNIQUE,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id   UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  posted_by         UUID NOT NULL REFERENCES zi_individuals(id),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL,
  sub_category      TEXT,
  quantity          NUMERIC(14,3),
  unit              TEXT,
  budget_min_paise  BIGINT,
  budget_max_paise  BIGINT,
  location_city     TEXT,
  location_state    TEXT,
  delivery_date     DATE,
  is_urgent         BOOLEAN NOT NULL DEFAULT FALSE,
  is_anonymous      BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'published'
                      CHECK (status IN (
                        'draft','published','matching','proposals_received',
                        'in_negotiation','deal_closed','completed','cancelled','expired'
                      )),
  proposal_count    INTEGER NOT NULL DEFAULT 0,
  expires_at        DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_znd_requirements_entity   ON znd_requirements(entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_status   ON znd_requirements(status);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_category ON znd_requirements(category);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_expires  ON znd_requirements(expires_at);

-- ─────────────────────────────────────────────────────────────
-- ZND Proposals — supplier's bid on a requirement (PRO prefix)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znd_proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  requirement_id   UUID NOT NULL REFERENCES znd_requirements(id) ON DELETE RESTRICT,
  proposed_by      UUID NOT NULL REFERENCES zi_individuals(id),
  price_paise      BIGINT NOT NULL,
  delivery_days    INTEGER NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','shortlisted','rejected','accepted','withdrawn')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_znd_proposals_requirement ON znd_proposals(requirement_id);
CREATE INDEX IF NOT EXISTS idx_znd_proposals_entity      ON znd_proposals(entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_proposals_status      ON znd_proposals(status);

-- Prevent duplicate active proposals from the same entity on the same requirement
CREATE UNIQUE INDEX IF NOT EXISTS idx_znd_proposals_unique_entity_req
  ON znd_proposals(entity_id, requirement_id)
  WHERE status NOT IN ('withdrawn','rejected');

-- ─────────────────────────────────────────────────────────────
-- ZND Deals — accepted agreement between buyer and seller (DL prefix)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znd_deals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                TEXT NOT NULL UNIQUE,
  ref_code               TEXT NOT NULL UNIQUE,
  buyer_entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  seller_entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  requirement_id         UUID NOT NULL REFERENCES znd_requirements(id) ON DELETE RESTRICT,
  proposal_id            UUID NOT NULL REFERENCES znd_proposals(id) ON DELETE RESTRICT,
  agreed_price_paise     BIGINT NOT NULL,
  agreed_delivery_date   DATE NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','in_progress','completed','disputed','cancelled')),
  completed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_znd_deals_buyer  ON znd_deals(buyer_entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_deals_seller ON znd_deals(seller_entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_deals_status ON znd_deals(status);

-- ─────────────────────────────────────────────────────────────
-- ZND Ratings — post-deal review (one per side per deal)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS znd_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  deal_id          UUID NOT NULL REFERENCES znd_deals(id) ON DELETE RESTRICT,
  rated_by         UUID NOT NULL REFERENCES zi_individuals(id),
  rated_entity_id  UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  score            INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  review           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One rating per rater per deal
CREATE UNIQUE INDEX IF NOT EXISTS idx_znd_ratings_unique ON znd_ratings(deal_id, rated_by);
CREATE INDEX IF NOT EXISTS idx_znd_ratings_entity ON znd_ratings(rated_entity_id);

-- ─────────────────────────────────────────────────────────────
-- Auto-update triggers (fn_set_updated_at already defined in 005)
-- ─────────────────────────────────────────────────────────────

-- Keep proposal_count in sync on znd_requirements
CREATE OR REPLACE FUNCTION fn_update_requirement_proposal_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE znd_requirements
  SET proposal_count = (
    SELECT COUNT(*) FROM znd_proposals
    WHERE requirement_id = COALESCE(NEW.requirement_id, OLD.requirement_id)
      AND status NOT IN ('withdrawn','rejected')
  )
  WHERE id = COALESCE(NEW.requirement_id, OLD.requirement_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_znd_proposal_count
  AFTER INSERT OR UPDATE OR DELETE ON znd_proposals
  FOR EACH ROW EXECUTE FUNCTION fn_update_requirement_proposal_count();

CREATE OR REPLACE TRIGGER tg_znd_requirements_updated_at
  BEFORE UPDATE ON znd_requirements FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_znd_proposals_updated_at
  BEFORE UPDATE ON znd_proposals    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_znd_deals_updated_at
  BEFORE UPDATE ON znd_deals        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE znd_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE znd_proposals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE znd_deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE znd_ratings      ENABLE ROW LEVEL SECURITY;

CREATE POLICY znd_requirements_deny_all ON znd_requirements FOR ALL USING (false);
CREATE POLICY znd_proposals_deny_all    ON znd_proposals    FOR ALL USING (false);
CREATE POLICY znd_deals_deny_all        ON znd_deals        FOR ALL USING (false);
CREATE POLICY znd_ratings_deny_all      ON znd_ratings      FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- ZiNeed feature flags seed
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZND', 'zineed_proposals_unlimited', 'Unlimited Proposals',     '["pro"]'),
  ('ZND', 'zineed_ai_match',            'AI Supplier Matching',    '["pro"]'),
  ('ZND', 'zineed_analytics',           'Marketplace Analytics',   '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

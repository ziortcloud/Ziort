
-- ============================================================
-- 6. zi_subscriptions
--    One row per entity × product combination.
--    Business Code: product_prefix + alpha → ZPNA01
--    Reference Code: ZEA01ZPNA01 (globally unique)
-- ============================================================
CREATE TABLE zi_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL,                 -- ZPNA01 (unique within entity)
  entity_id         UUID NOT NULL REFERENCES zi_entities(id),
  ref_code          TEXT UNIQUE NOT NULL,          -- ZEA01ZPNA01 (globally unique)
  product_code      TEXT NOT NULL,                 -- ZPN | ZFLT | ZLD | ZFD | ZCR | ZPLS | ZND...
  product_name      TEXT NOT NULL,                 -- ZiPawn | ZiFleet...
  plan_type         TEXT NOT NULL DEFAULT 'trial', -- trial | solo | plus | pro
  status            TEXT NOT NULL DEFAULT 'trial', -- trial | active | paused | grace | cancelled
  trial_start       DATE,
  trial_end         DATE,
  billing_start     DATE,
  is_annual         BOOLEAN NOT NULL DEFAULT FALSE,
  max_users         INT,                           -- null = unlimited (pro)
  primary_owner_id  UUID REFERENCES zi_individuals(id),
  billing_owner_id  UUID REFERENCES zi_individuals(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, zi_code),
  CONSTRAINT chk_plan_type CHECK (plan_type IN ('trial','solo','plus','pro')),
  CONSTRAINT chk_status CHECK (status IN ('trial','active','paused','grace','cancelled'))
);

CREATE INDEX idx_subs_entity ON zi_subscriptions(entity_id);
CREATE INDEX idx_subs_product ON zi_subscriptions(product_code);s

-- ============================================================
-- 5. zi_branches
--    Physical location or operational unit under an entity.
--    Business Code: ZBR prefix → ZBRA01
--    Reference Code: ZEA01ZBRA01 (globally unique)
-- ============================================================
CREATE TABLE zi_branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code       TEXT NOT NULL,                     -- ZBRA01 (unique within entity)
  entity_id     UUID NOT NULL REFERENCES zi_entities(id),
  ref_code      TEXT UNIQUE NOT NULL,              -- ZEA01ZBRA01 (globally unique)
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  country_code  TEXT NOT NULL DEFAULT 'IN',
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,    -- head office flag
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, zi_code)
);

CREATE INDEX idx_branches_entity ON zi_branches(entity_id);s
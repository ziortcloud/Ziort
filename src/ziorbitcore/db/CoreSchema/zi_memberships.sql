
-- ============================================================
-- 7. zi_memberships
--    Individual ↔ Entity link with role.
--    Reference Code: ZEA01ZUA01 (entity_code + individual_code)
--    No own zi_code — the ref_code IS the identifier.
-- ============================================================
CREATE TABLE zi_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code          TEXT UNIQUE NOT NULL,          -- ZEA01ZUA01 (entity_code + individual_code)
  entity_id         UUID NOT NULL REFERENCES zi_entities(id),
  individual_id     UUID NOT NULL REFERENCES zi_individuals(id),
  role              TEXT NOT NULL,                 -- owner | co_owner | partner | manager | staff | custom
  is_primary_owner  BOOLEAN NOT NULL DEFAULT FALSE,
  is_billing_owner  BOOLEAN NOT NULL DEFAULT FALSE,
  equity_percent    NUMERIC(5,2),                  -- for partners, co-owners
  permissions       JSONB,                         -- for custom roles
  branch_access     JSONB,                         -- array of branch ref_codes, null = all branches
  invited_by        UUID REFERENCES zi_individuals(id),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,                   -- for temporary staff access
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, individual_id),
  CONSTRAINT chk_role CHECK (role IN ('owner','co_owner','partner','manager','staff','custom'))
);

-- Enforce: only one primary_owner and one billing_owner per entity
CREATE UNIQUE INDEX idx_memberships_primary_owner
  ON zi_memberships(entity_id)
  WHERE is_primary_owner = TRUE;

CREATE UNIQUE INDEX idx_memberships_billing_owner
  ON zi_memberships(entity_id)
  WHERE is_billing_owner = TRUE;

CREATE INDEX idx_memberships_entity ON zi_memberships(entity_id);
CREATE INDEX idx_memberships_individual ON zi_memberships(individual_id);
s
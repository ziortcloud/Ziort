
-- ============================================================
-- zi_audit_log
--    Every write operation must produce one row here.
--    Written by API layer (never by client), never by triggers
--    (triggers are hard to debug; API layer owns this).
-- ============================================================
CREATE TABLE zi_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID REFERENCES zi_entities(id),       -- null for platform-level actions
  individual_id  UUID REFERENCES zi_individuals(id),     -- who did it (null = system)
  action         TEXT NOT NULL,                          -- CREATE | UPDATE | DELETE | LOGIN | EXPORT
  table_name     TEXT NOT NULL,                          -- which table was affected
  record_id      UUID,                                   -- primary key of affected row
  ref_code       TEXT,                                   -- business ref code of affected record
  old_value      JSONB,                                  -- row before change (null for CREATE)
  new_value      JSONB,                                  -- row after change (null for DELETE)
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_action CHECK (
    action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','IMPORT','VIEW')
  )
);

-- Partition-ready indexes
CREATE INDEX idx_audit_entity ON zi_audit_log(entity_id, created_at DESC);
CREATE INDEX idx_audit_individual ON zi_audit_log(individual_id, created_at DESC);
CREATE INDEX idx_audit_ref_code ON zi_audit_log(ref_code);
CREATE INDEX idx_audit_table ON zi_audit_log(table_name, created_at DESC);


-- ============================================================
-- zi_integration_events
--    Cross-product trigger queue.
--    Source product writes → target product consumes.
--    Example: ZiPawn new customer → ZiPulse auto-create contact
--    Processed by /api/v1/integrations/process (cron every 1 min)
-- ============================================================
CREATE TABLE zi_integration_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product TEXT NOT NULL,                          -- ZPN | ZFLT | ZND ...
  target_product TEXT NOT NULL,                          -- ZPLS | ZND | ZLDG ...
  event_type     TEXT NOT NULL,                          -- customer.created | deal.completed | stock.low ...
  entity_id      UUID NOT NULL REFERENCES zi_entities(id),
  source_ref_code TEXT,                                  -- ref code of the source record
  payload        JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'pending',        -- pending | processing | done | failed
  attempts       INT NOT NULL DEFAULT 0,
  last_error     TEXT,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_status CHECK (status IN ('pending','processing','done','failed'))
);

CREATE INDEX idx_int_events_status ON zi_integration_events(status, created_at ASC);
CREATE INDEX idx_int_events_entity ON zi_integration_events(entity_id);
CREATE INDEX idx_int_events_target ON zi_integration_events(target_product, status);

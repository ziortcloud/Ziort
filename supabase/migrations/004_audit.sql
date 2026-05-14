-- ============================================================
-- Ziort — Migration 004: Audit Log + Integration Events
-- Immutable audit trail for every CREATE/UPDATE/DELETE.
-- ============================================================

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

-- ============================================================
-- zi_notification_log
--    Record of every SMS / WhatsApp / email sent.
-- ============================================================
CREATE TABLE zi_notification_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID REFERENCES zi_entities(id),
  individual_id  UUID REFERENCES zi_individuals(id),
  channel        TEXT NOT NULL,                          -- sms | whatsapp | email | push
  recipient      TEXT NOT NULL,                          -- phone or email (display-safe)
  event_key      TEXT NOT NULL,                          -- e.g. loan.approved, payment.received
  subject        TEXT,                                   -- for email
  body_preview   TEXT,                                   -- first 100 chars
  provider       TEXT,                                   -- msg91 | resend | twilio
  provider_id    TEXT,                                   -- provider's message ID
  status         TEXT NOT NULL DEFAULT 'queued',         -- queued | sent | delivered | failed
  cost_paise     INT NOT NULL DEFAULT 0,                 -- deducted from notification credits
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at   TIMESTAMPTZ,
  CONSTRAINT chk_channel CHECK (channel IN ('sms','whatsapp','email','push'))
);

CREATE INDEX idx_notif_entity ON zi_notification_log(entity_id, created_at DESC);

-- ============================================================
-- zi_feature_flags
--    Defines which features are available on which plan tiers.
--    Checked by API layer before executing feature-gated logic.
-- ============================================================
CREATE TABLE zi_feature_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL,                            -- ZPN | ZPLS | ZND | * (all)
  flag_key     TEXT NOT NULL,
  label        TEXT NOT NULL,
  plan_tiers   JSONB NOT NULL DEFAULT '["trial","solo","plus","pro"]',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  description  TEXT,
  UNIQUE(product_code, flag_key)
);

-- Seed: Core platform feature gates
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('*',    'multi_branch',         'Multiple Branches',        '["plus","pro"]'),
  ('*',    'multi_user',           'Multiple Users',           '["plus","pro"]'),
  ('*',    'api_access',           'API Access',               '["pro"]'),
  ('*',    'advanced_reports',     'Advanced Reports',         '["plus","pro"]'),
  ('*',    'notifications_sms',    'SMS Notifications',        '["solo","plus","pro"]'),
  ('*',    'notifications_wa',     'WhatsApp Notifications',   '["plus","pro"]'),
  ('ZPLS', 'pulse_team_view',      'Team Pulse Dashboard',     '["plus","pro"]'),
  ('ZPLS', 'pulse_ai_suggest',     'AI Follow-up Suggestions', '["pro"]'),
  ('ZND',  'zineed_featured',      'Featured Supplier Listing','["plus","pro"]'),
  ('ZND',  'zineed_priority_boost','Priority Boost Listing',   '["solo","plus","pro"]');

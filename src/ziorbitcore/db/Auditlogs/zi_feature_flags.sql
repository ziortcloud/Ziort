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

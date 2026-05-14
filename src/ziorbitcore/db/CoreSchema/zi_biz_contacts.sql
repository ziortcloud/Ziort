
-- ============================================================
-- 8. zi_biz_contacts
--    People who interact WITH a business (customers, suppliers, etc.)
--    Always scoped to entity + product subscription.
--    Business Code: CST/SUP/VND/AGT/PTR + alpha → CSTA01
--    Reference Code: ZEA01ZPNA01CSTA01
-- ============================================================
CREATE TABLE zi_biz_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL,                  -- CSTA01 (unique within entity+sub+type)
  ref_code         TEXT UNIQUE NOT NULL,           -- ZEA01ZPNA01CSTA01
  entity_id        UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id),
  individual_id    UUID REFERENCES zi_individuals(id), -- null if walk-in / not on platform
  contact_type     TEXT NOT NULL,                  -- CST | SUP | VND | AGT | PTR
  display_name     TEXT NOT NULL,
  mobile_display   TEXT,                           -- last 4 digits cached
  email_display    TEXT,                           -- email cached for display
  tags             JSONB,                          -- flexible tagging
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, subscription_id, contact_type, zi_code),
  CONSTRAINT chk_contact_type CHECK (contact_type IN ('CST','SUP','VND','AGT','PTR'))
);

CREATE INDEX idx_biz_contacts_entity ON zi_biz_contacts(entity_id);
CREATE INDEX idx_biz_contacts_sub ON zi_biz_contacts(subscription_id);
CREATE INDEX idx_biz_contacts_individual ON zi_biz_contacts(individual_id);
s
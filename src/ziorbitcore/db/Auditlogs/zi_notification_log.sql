
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

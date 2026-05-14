-- ============================================================
-- Ziort — Migration 008: ZiPulse (Business Relationship OS)
-- Product code: ZPLS
-- Tagline: Every business relationship has a pulse.
-- Run after: 007_zineed.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- CONTACTS — every person a business interacts with
-- Pulse Score tracks relationship health (0–100)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,             -- CSTA01
  ref_code              TEXT UNIQUE NOT NULL,       -- ZEA01ZPLSA01CSTA01
  entity_id             UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id       UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id             UUID REFERENCES zi_branches(id),
  assigned_to           UUID REFERENCES zi_individuals(id),

  -- Identity
  individual_id         UUID REFERENCES zi_individuals(id),  -- if this contact is a Ziort user
  name                  TEXT NOT NULL,
  company_name          TEXT,
  designation           TEXT,
  mobile_hash           TEXT NOT NULL,             -- SHA-256 (never store raw mobile)
  mobile_last4          TEXT NOT NULL,             -- display only
  mobile_alternate_hash TEXT,
  email                 TEXT,
  address               TEXT,
  city                  TEXT,
  country_code          TEXT NOT NULL DEFAULT 'IN',
  profile_photo_url     TEXT,

  -- Source tracking
  source                TEXT NOT NULL DEFAULT 'manual',
  -- manual|walk_in|zimatch|zipawn|zifleet|zifood|zicare|ziledger|zipartner|referral|cold_call|inbound
  source_ref_code       TEXT,
  referred_by_contact   UUID REFERENCES zipulse_contacts(id),
  referred_by_agent     UUID REFERENCES zi_individuals(id),

  -- Pulse score (0–100)
  pulse_score           INTEGER NOT NULL DEFAULT 70 CHECK (pulse_score BETWEEN 0 AND 100),
  pulse_status          TEXT NOT NULL DEFAULT 'warm'
                          CHECK (pulse_status IN ('hot','warm','cool','silent','closed','lost')),
  last_contact_at       TIMESTAMPTZ,
  next_followup_at      TIMESTAMPTZ,
  next_followup_channel TEXT CHECK (next_followup_channel IN ('call','whatsapp','visit','email','meeting')),

  -- Denormalized relationship counters (updated by API on each write)
  total_threads         INTEGER NOT NULL DEFAULT 0,
  total_promises        INTEGER NOT NULL DEFAULT 0,
  broken_promises       INTEGER NOT NULL DEFAULT 0,
  total_enquiries       INTEGER NOT NULL DEFAULT 0,
  won_enquiries         INTEGER NOT NULL DEFAULT 0,
  total_won_value_paise BIGINT  NOT NULL DEFAULT 0,
  total_followups       INTEGER NOT NULL DEFAULT 0,
  missed_followups      INTEGER NOT NULL DEFAULT 0,

  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at           TIMESTAMPTZ,
  archive_reason        TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpulse_contacts_entity  ON zipulse_contacts(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_contacts_sub     ON zipulse_contacts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_contacts_mobile  ON zipulse_contacts(mobile_hash);
CREATE INDEX IF NOT EXISTS idx_zpulse_contacts_pulse   ON zipulse_contacts(pulse_score DESC);
CREATE INDEX IF NOT EXISTS idx_zpulse_contacts_status  ON zipulse_contacts(pulse_status);
CREATE INDEX IF NOT EXISTS idx_zpulse_contacts_followup ON zipulse_contacts(next_followup_at);

-- ─────────────────────────────────────────────────────────────
-- CONTACT TAGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_contact_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code        TEXT UNIQUE NOT NULL,      -- ZEA01ZPLSA01TAGA01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE CASCADE,
  tag_name        TEXT NOT NULL,
  tag_type        TEXT NOT NULL DEFAULT 'custom' CHECK (tag_type IN ('system','custom')),
  tag_color       TEXT,                      -- hex color for UI
  created_by      UUID REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpulse_tags_contact ON zipulse_contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_tags_entity  ON zipulse_contact_tags(entity_id);

-- ─────────────────────────────────────────────────────────────
-- ENQUIRIES — pipeline from first interest to closure
-- Created before threads/promises so they can reference enquiries
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,             -- ENQ26A01
  ref_code        TEXT UNIQUE NOT NULL,      -- ZEA01ZPLSA01ENQ26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE RESTRICT,
  assigned_to     UUID REFERENCES zi_individuals(id),

  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  product_interest TEXT,
  value           NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  probability     INTEGER NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  source          TEXT,

  -- Pipeline
  stage           TEXT NOT NULL DEFAULT 'new'
                    CHECK (stage IN ('new','contacted','interested','quote_sent',
                                     'negotiating','decision_pending','won','lost','on_hold')),
  stage_history   JSONB NOT NULL DEFAULT '[]',  -- [{stage, changed_at, changed_by, note}]
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Closure
  expected_close  DATE,
  won_at          TIMESTAMPTZ,
  won_value       NUMERIC,
  lost_at         TIMESTAMPTZ,
  lost_reason     TEXT,
  lost_to         TEXT,

  total_threads   INTEGER NOT NULL DEFAULT 0,
  total_followups INTEGER NOT NULL DEFAULT 0,
  total_promises  INTEGER NOT NULL DEFAULT 0,

  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpulse_enq_entity   ON zipulse_enquiries(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_enq_contact  ON zipulse_enquiries(contact_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_enq_stage    ON zipulse_enquiries(stage);
CREATE INDEX IF NOT EXISTS idx_zpulse_enq_assigned ON zipulse_enquiries(assigned_to);

-- ─────────────────────────────────────────────────────────────
-- MEETINGS — scheduled business meetings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,             -- MTG26A01
  ref_code        TEXT UNIQUE NOT NULL,      -- ZEA01ZPLSA01MTG26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE RESTRICT,
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),

  title           TEXT NOT NULL,
  location        TEXT,
  location_url    TEXT,
  meeting_url     TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INTEGER NOT NULL DEFAULT 30,
  agenda          TEXT,
  pre_notes       TEXT,

  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','completed','cancelled','rescheduled')),
  completed_at    TIMESTAMPTZ,
  outcome         TEXT,
  action_items    JSONB NOT NULL DEFAULT '[]',   -- [{description, assigned_to, due_date}]
  next_step       TEXT,

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpulse_mtg_entity   ON zipulse_meetings(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_mtg_contact  ON zipulse_meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_mtg_schedule ON zipulse_meetings(scheduled_at DESC);

-- ─────────────────────────────────────────────────────────────
-- CONVERSATION THREADS — living record of every interaction
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,             -- THR26A01
  ref_code        TEXT UNIQUE NOT NULL,      -- ZEA01ZPLSA01CSTA01THR26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE RESTRICT,
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),
  meeting_id      UUID REFERENCES zipulse_meetings(id),

  entry_type      TEXT NOT NULL
                    CHECK (entry_type IN ('note','voice_note','file','photo','promise',
                                          'meeting','quote_sent','follow_up','status_change',
                                          'payment','system')),
  content         TEXT,
  voice_url       TEXT,
  voice_transcript TEXT,
  file_url        TEXT,
  file_name       TEXT,
  file_type       TEXT,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  is_private      BOOLEAN NOT NULL DEFAULT FALSE,
  source_app      TEXT,
  source_ref_code TEXT,

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpulse_thr_contact ON zipulse_threads(contact_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_thr_entity  ON zipulse_threads(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_thr_type    ON zipulse_threads(entry_type);

-- ─────────────────────────────────────────────────────────────
-- PROMISES — ZiPulse's most unique feature
-- Track every commitment, direction: owner→contact or contact→owner
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_promises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,             -- PRM26A01
  ref_code        TEXT UNIQUE NOT NULL,      -- ZEA01ZPLSA01CSTA01PRM26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE RESTRICT,
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),
  thread_id       UUID REFERENCES zipulse_threads(id),

  promise_type    TEXT NOT NULL
                    CHECK (promise_type IN ('send_quote','call_back','visit','confirm',
                                            'deliver','introduce','payment','send_document','custom')),
  direction       TEXT NOT NULL DEFAULT 'owner_to_contact'
                    CHECK (direction IN ('owner_to_contact','contact_to_owner')),
  description     TEXT NOT NULL,
  promised_by     UUID REFERENCES zi_individuals(id),
  due_at          TIMESTAMPTZ NOT NULL,
  reminder_at     TIMESTAMPTZ,

  is_fulfilled    BOOLEAN NOT NULL DEFAULT FALSE,
  fulfilled_at    TIMESTAMPTZ,
  fulfillment_note TEXT,
  is_broken       BOOLEAN NOT NULL DEFAULT FALSE,
  broken_reason   TEXT,

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpulse_prm_contact ON zipulse_promises(contact_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_prm_entity  ON zipulse_promises(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_prm_due     ON zipulse_promises(due_at);
CREATE INDEX IF NOT EXISTS idx_zpulse_prm_broken  ON zipulse_promises(is_broken);

-- ─────────────────────────────────────────────────────────────
-- FOLLOW-UPS — active reminder engine
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_followups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,             -- FUP26A01
  ref_code        TEXT UNIQUE NOT NULL,      -- ZEA01ZPLSA01CSTA01FUP26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE RESTRICT,
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),
  assigned_to     UUID NOT NULL REFERENCES zi_individuals(id),

  channel         TEXT NOT NULL DEFAULT 'call'
                    CHECK (channel IN ('call','whatsapp','visit','email','meeting')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  reminder_at     TIMESTAMPTZ,
  agenda          TEXT,

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','done','missed','rescheduled','cancelled')),
  completed_at    TIMESTAMPTZ,
  outcome         TEXT
                    CHECK (outcome IN ('spoke_positive','spoke_neutral','spoke_negative',
                                       'no_answer','rescheduled','meeting_scheduled',
                                       'deal_progressed','deal_closed','deal_lost', NULL)),
  outcome_notes   TEXT,
  next_followup_at TIMESTAMPTZ,

  is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('daily','weekly','monthly','quarterly')),
  parent_followup UUID REFERENCES zipulse_followups(id),

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zpulse_fup_contact   ON zipulse_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_fup_entity    ON zipulse_followups(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_fup_scheduled ON zipulse_followups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_zpulse_fup_status    ON zipulse_followups(status);
CREATE INDEX IF NOT EXISTS idx_zpulse_fup_assigned  ON zipulse_followups(assigned_to);

-- ─────────────────────────────────────────────────────────────
-- SMART INBOX — zero-friction capture before organizing
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_inbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  captured_by     UUID NOT NULL REFERENCES zi_individuals(id),

  content_type    TEXT NOT NULL DEFAULT 'note'
                    CHECK (content_type IN ('note','voice','photo','file','link','system')),
  content         TEXT,
  media_url       TEXT,
  source_app      TEXT,
  source_ref_code TEXT,

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','converted','archived')),
  converted_to    TEXT,              -- contact|enquiry|followup|note|task
  converted_ref   TEXT,              -- ref_code of resulting record
  converted_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_zpulse_inbox_entity ON zipulse_inbox(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpulse_inbox_status ON zipulse_inbox(status);
CREATE INDEX IF NOT EXISTS idx_zpulse_inbox_cap    ON zipulse_inbox(captured_by);

-- ─────────────────────────────────────────────────────────────
-- PULSE SCORE HISTORY — trend tracking per contact
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zipulse_score_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES zipulse_contacts(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  status      TEXT NOT NULL,
  reason      TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpulse_score_contact ON zipulse_score_history(contact_id, recorded_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Triggers (fn_set_updated_at already defined in 005_zipawn)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER tg_zpulse_contacts_updated_at
  BEFORE UPDATE ON zipulse_contacts  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpulse_enquiries_updated_at
  BEFORE UPDATE ON zipulse_enquiries FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpulse_meetings_updated_at
  BEFORE UPDATE ON zipulse_meetings  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Counter triggers — keep denormalized columns accurate
-- These fire on INSERT/UPDATE so API code needs no manual increments
-- ─────────────────────────────────────────────────────────────

-- Thread inserted → bump total_threads + refresh last_contact_at
CREATE OR REPLACE FUNCTION fn_zpulse_on_thread_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zipulse_contacts
  SET total_threads   = total_threads + 1,
      last_contact_at = now(),
      updated_at      = now()
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_thread_insert
  AFTER INSERT ON zipulse_threads
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_thread_insert();

-- Promise inserted → bump total_promises on contact; also on enquiry if linked
CREATE OR REPLACE FUNCTION fn_zpulse_on_promise_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zipulse_contacts
  SET total_promises = total_promises + 1,
      updated_at     = now()
  WHERE id = NEW.contact_id;

  IF NEW.enquiry_id IS NOT NULL THEN
    UPDATE zipulse_enquiries
    SET total_promises = total_promises + 1,
        updated_at     = now()
    WHERE id = NEW.enquiry_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_promise_insert
  AFTER INSERT ON zipulse_promises
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_promise_insert();

-- Promise broken (is_broken flips FALSE→TRUE) → bump broken_promises
CREATE OR REPLACE FUNCTION fn_zpulse_on_promise_break()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_broken = TRUE AND (OLD.is_broken IS NULL OR OLD.is_broken = FALSE) THEN
    UPDATE zipulse_contacts
    SET broken_promises = broken_promises + 1,
        updated_at      = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_promise_break
  AFTER UPDATE ON zipulse_promises
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_promise_break();

-- Followup inserted → bump total_followups
CREATE OR REPLACE FUNCTION fn_zpulse_on_followup_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zipulse_contacts
  SET total_followups = total_followups + 1,
      updated_at      = now()
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_followup_insert
  AFTER INSERT ON zipulse_followups
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_followup_insert();

-- Followup outcome set to no_answer → bump missed_followups
CREATE OR REPLACE FUNCTION fn_zpulse_on_followup_missed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.outcome = 'no_answer' AND (OLD.outcome IS DISTINCT FROM 'no_answer') THEN
    UPDATE zipulse_contacts
    SET missed_followups = missed_followups + 1,
        updated_at       = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_followup_missed
  AFTER UPDATE ON zipulse_followups
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_followup_missed();

-- Enquiry inserted → bump total_enquiries on contact
CREATE OR REPLACE FUNCTION fn_zpulse_on_enquiry_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zipulse_contacts
  SET total_enquiries = total_enquiries + 1,
      updated_at      = now()
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_enquiry_insert
  AFTER INSERT ON zipulse_enquiries
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_enquiry_insert();

-- Enquiry stage moves to won → bump won_enquiries + add won_value_paise
CREATE OR REPLACE FUNCTION fn_zpulse_on_enquiry_won()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage = 'won' AND OLD.stage IS DISTINCT FROM 'won' THEN
    UPDATE zipulse_contacts
    SET won_enquiries         = won_enquiries + 1,
        total_won_value_paise = total_won_value_paise +
                                COALESCE(ROUND(NEW.won_value * 100)::BIGINT, 0),
        updated_at            = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_zpulse_enquiry_won
  AFTER UPDATE ON zipulse_enquiries
  FOR EACH ROW EXECUTE FUNCTION fn_zpulse_on_enquiry_won();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security (API uses service role — bypasses RLS)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zipulse_contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_contact_tags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_enquiries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_meetings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_promises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_followups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_inbox         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipulse_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY zpulse_contacts_deny_all      ON zipulse_contacts      FOR ALL USING (false);
CREATE POLICY zpulse_tags_deny_all          ON zipulse_contact_tags  FOR ALL USING (false);
CREATE POLICY zpulse_enquiries_deny_all     ON zipulse_enquiries     FOR ALL USING (false);
CREATE POLICY zpulse_meetings_deny_all      ON zipulse_meetings      FOR ALL USING (false);
CREATE POLICY zpulse_threads_deny_all       ON zipulse_threads       FOR ALL USING (false);
CREATE POLICY zpulse_promises_deny_all      ON zipulse_promises      FOR ALL USING (false);
CREATE POLICY zpulse_followups_deny_all     ON zipulse_followups     FOR ALL USING (false);
CREATE POLICY zpulse_inbox_deny_all         ON zipulse_inbox         FOR ALL USING (false);
CREATE POLICY zpulse_score_history_deny_all ON zipulse_score_history FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- ZiPulse feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZPLS', 'zipulse_team_view',     'Team Pulse Dashboard',       '["plus","pro"]'),
  ('ZPLS', 'zipulse_ai_suggest',    'AI Follow-up Suggestions',   '["pro"]'),
  ('ZPLS', 'zipulse_pipeline',      'Enquiry Pipeline (Kanban)',   '["solo","plus","pro"]'),
  ('ZPLS', 'zipulse_smart_inbox',   'Smart Inbox',                '["solo","plus","pro"]'),
  ('ZPLS', 'zipulse_whatsapp',      'WhatsApp Follow-up via ZiPost','["plus","pro"]'),
  ('ZPLS', 'zipulse_archive',       'Knowledge Base Archive',     '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

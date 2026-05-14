-- ============================================================
-- Ziort — Migration 011: ZiDriver (Self-Employed Driver Marketplace)
-- Product code: ZDR
-- Tagline: Your truck. Your terms. Your career.
-- Run after: 010_ziload.sql
--
-- ZiDriver is the driver's own professional identity.
-- ZiFleet manages company-owned drivers top-down.
-- ZiDriver is bottom-up — individual drivers build their own
-- marketplace profile, post availability, and accept hire offers
-- from ZiFleet operators and ZiLoad transporters.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ZDR Profiles — driver's professional marketplace card
-- One per entity. entity_id UNIQUE enforces one driver per account.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zdr_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL UNIQUE,              -- ZDRA01
  entity_id           UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id     UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  -- Identity (no raw mobile stored — SHA-256 only)
  full_name           TEXT NOT NULL,
  mobile_hash         TEXT NOT NULL,
  mobile_last4        TEXT NOT NULL CHECK (mobile_last4 ~ '^\d{4}$'),
  photo_url           TEXT,
  dob                 DATE,
  gender              TEXT CHECK (gender IN ('male','female','other')),

  -- Location
  home_city           TEXT NOT NULL,
  home_state          TEXT NOT NULL,
  current_city        TEXT,

  -- Professional profile
  experience_years    INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  vehicle_types       TEXT[] NOT NULL DEFAULT '{}',   -- types driver can operate
  preferred_routes    TEXT,                            -- free text: "Mumbai → Pune → Nashik"
  languages           TEXT[] NOT NULL DEFAULT '{"Hindi"}',
  about               TEXT CHECK (char_length(about) <= 500),

  -- License (mandatory)
  license_number      TEXT NOT NULL,
  license_type        TEXT NOT NULL
                        CHECK (license_type IN ('LMV','HMV','HTV','PSV','TRANSPORT')),
  license_expiry      DATE NOT NULL,

  -- Discovery status
  availability_status TEXT NOT NULL DEFAULT 'INACTIVE'
                        CHECK (availability_status IN ('AVAILABLE','BUSY','INACTIVE')),
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Counters — trigger-maintained, never written directly by API
  avg_rating          NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_trips         INTEGER NOT NULL DEFAULT 0,
  total_ratings       INTEGER NOT NULL DEFAULT 0,
  total_km_driven     INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zdr_profiles_entity   ON zdr_profiles(entity_id);
CREATE INDEX IF NOT EXISTS idx_zdr_profiles_status   ON zdr_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_zdr_profiles_city     ON zdr_profiles(home_city);
CREATE INDEX IF NOT EXISTS idx_zdr_profiles_rating   ON zdr_profiles(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_zdr_profiles_mobile   ON zdr_profiles(mobile_hash);

-- ─────────────────────────────────────────────────────────────
-- ZDR Availability — driver posts windows of availability
-- Hirer entities discover drivers by searching this board.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zdr_availability (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_entity_id UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  available_from   DATE NOT NULL,
  available_until  DATE,
  from_city        TEXT NOT NULL,       -- where driver currently is / will start
  to_city          TEXT,                -- preferred destination (NULL = anywhere)
  vehicle_type_pref TEXT CHECK (vehicle_type_pref IN (
                      'LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER'
                    )),
  rate_paise       BIGINT CHECK (rate_paise > 0),
  rate_type        TEXT NOT NULL DEFAULT 'PER_DAY'
                     CHECK (rate_type IN ('PER_DAY','PER_TRIP','PER_KM')),
  notes            TEXT CHECK (char_length(notes) <= 300),

  status           TEXT NOT NULL DEFAULT 'POSTED'
                     CHECK (status IN ('POSTED','BOOKED','EXPIRED','WITHDRAWN')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zdr_avail_driver  ON zdr_availability(driver_entity_id);
CREATE INDEX IF NOT EXISTS idx_zdr_avail_status  ON zdr_availability(status);
CREATE INDEX IF NOT EXISTS idx_zdr_avail_city    ON zdr_availability(from_city);
CREATE INDEX IF NOT EXISTS idx_zdr_avail_from    ON zdr_availability(available_from);

-- ─────────────────────────────────────────────────────────────
-- ZDR Documents — driver's professional document vault
-- License, permits, fitness certs, ID proof — all in one place
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zdr_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_entity_id UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  doc_type         TEXT NOT NULL CHECK (doc_type IN (
                     'LICENSE','FITNESS_CERT','NATIONAL_PERMIT','STATE_PERMIT',
                     'AADHAAR','PAN','INSURANCE','POLLUTION_CERT','BADGE','OTHER'
                   )),
  doc_number       TEXT,
  doc_url          TEXT NOT NULL,
  issued_at        DATE,
  expiry_date      DATE,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at      TIMESTAMPTZ,
  notes            TEXT,

  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zdr_docs_driver  ON zdr_documents(driver_entity_id);
CREATE INDEX IF NOT EXISTS idx_zdr_docs_type    ON zdr_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_zdr_docs_expiry  ON zdr_documents(expiry_date);

-- ─────────────────────────────────────────────────────────────
-- ZDR Engagements — hire offer from a fleet/shipper entity to a driver
-- Lifecycle: OFFERED → ACCEPTED | REJECTED
--            ACCEPTED → IN_PROGRESS → COMPLETED | CANCELLED
-- Optional back-links to ZiFleet trip or ZiLoad booking.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zdr_engagements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL UNIQUE,              -- DE26A01

  hirer_entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  hirer_subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  driver_entity_id      UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,

  engagement_type       TEXT NOT NULL
                          CHECK (engagement_type IN ('FLEET','LOAD','ADHOC')),

  -- Optional cross-product links
  zft_trip_id           UUID,             -- references zft_trips.id (no FK to avoid coupling)
  zld_booking_id        UUID,             -- references zld_bookings.id

  -- Job description
  title                 TEXT NOT NULL CHECK (char_length(title) <= 200),
  description           TEXT,
  from_city             TEXT NOT NULL,
  to_city               TEXT,
  start_date            DATE NOT NULL,
  end_date              DATE,
  vehicle_type          TEXT,

  -- Compensation
  offered_rate_paise    BIGINT NOT NULL CHECK (offered_rate_paise > 0),
  rate_type             TEXT NOT NULL DEFAULT 'PER_TRIP'
                          CHECK (rate_type IN ('PER_DAY','PER_TRIP','PER_KM')),
  advance_paise         BIGINT NOT NULL DEFAULT 0,

  -- Lifecycle
  status                TEXT NOT NULL DEFAULT 'OFFERED'
                          CHECK (status IN (
                            'OFFERED','ACCEPTED','REJECTED',
                            'IN_PROGRESS','COMPLETED','CANCELLED'
                          )),
  offer_note            TEXT,
  accept_note           TEXT,
  reject_reason         TEXT,
  cancel_reason         TEXT,

  -- Completion metadata
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  actual_km             INTEGER CHECK (actual_km >= 0),

  created_by            UUID NOT NULL REFERENCES zi_individuals(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zdr_eng_hirer   ON zdr_engagements(hirer_entity_id);
CREATE INDEX IF NOT EXISTS idx_zdr_eng_driver  ON zdr_engagements(driver_entity_id);
CREATE INDEX IF NOT EXISTS idx_zdr_eng_status  ON zdr_engagements(status);
CREATE INDEX IF NOT EXISTS idx_zdr_eng_start   ON zdr_engagements(start_date);

-- ─────────────────────────────────────────────────────────────
-- ZDR Ratings — hirer rates driver post-completion
-- Trigger recalculates avg_rating on zdr_profiles.
-- One rating per hirer per engagement.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zdr_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id    UUID NOT NULL REFERENCES zdr_engagements(id) ON DELETE RESTRICT,
  hirer_entity_id  UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  driver_entity_id UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review           TEXT CHECK (char_length(review) <= 500),
  rated_by         UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (engagement_id, hirer_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_zdr_ratings_driver ON zdr_ratings(driver_entity_id);
CREATE INDEX IF NOT EXISTS idx_zdr_ratings_eng    ON zdr_ratings(engagement_id);

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- updated_at maintenance
CREATE OR REPLACE TRIGGER tg_zdr_profiles_updated_at
  BEFORE UPDATE ON zdr_profiles     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zdr_avail_updated_at
  BEFORE UPDATE ON zdr_availability FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zdr_docs_updated_at
  BEFORE UPDATE ON zdr_documents    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zdr_eng_updated_at
  BEFORE UPDATE ON zdr_engagements  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Rating inserted → recalculate avg_rating + total_ratings on driver profile
CREATE OR REPLACE FUNCTION fn_zdr_on_rating_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zdr_profiles
  SET avg_rating    = (
        SELECT ROUND(AVG(rating::NUMERIC), 2)
        FROM zdr_ratings
        WHERE driver_entity_id = NEW.driver_entity_id
      ),
      total_ratings = (
        SELECT COUNT(*) FROM zdr_ratings
        WHERE driver_entity_id = NEW.driver_entity_id
      ),
      updated_at    = now()
  WHERE entity_id = NEW.driver_entity_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zdr_rating_insert
  AFTER INSERT ON zdr_ratings
  FOR EACH ROW EXECUTE FUNCTION fn_zdr_on_rating_insert();

-- Engagement status → COMPLETED: bump total_trips + total_km_driven
CREATE OR REPLACE FUNCTION fn_zdr_on_engagement_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN
    UPDATE zdr_profiles
    SET total_trips     = total_trips + 1,
        total_km_driven = total_km_driven + COALESCE(NEW.actual_km, 0),
        updated_at      = now()
    WHERE entity_id = NEW.driver_entity_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zdr_engagement_complete
  AFTER UPDATE ON zdr_engagements
  FOR EACH ROW EXECUTE FUNCTION fn_zdr_on_engagement_complete();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — deny all; API uses service role
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zdr_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zdr_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE zdr_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE zdr_engagements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zdr_ratings      ENABLE ROW LEVEL SECURITY;

CREATE POLICY zdr_profiles_deny_all     ON zdr_profiles     FOR ALL USING (false);
CREATE POLICY zdr_avail_deny_all        ON zdr_availability FOR ALL USING (false);
CREATE POLICY zdr_docs_deny_all         ON zdr_documents    FOR ALL USING (false);
CREATE POLICY zdr_engagements_deny_all  ON zdr_engagements  FOR ALL USING (false);
CREATE POLICY zdr_ratings_deny_all      ON zdr_ratings      FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZDR', 'zidriver_marketplace',   'Driver Marketplace Listing',   '["solo","plus","pro"]'),
  ('ZDR', 'zidriver_doc_vault',     'Document Vault & Expiry Alerts','["solo","plus","pro"]'),
  ('ZDR', 'zidriver_analytics',     'Earnings & Trip Analytics',    '["plus","pro"]'),
  ('ZDR', 'zidriver_fleet_link',    'ZiFleet Integration',          '["plus","pro"]'),
  ('ZDR', 'zidriver_load_link',     'ZiLoad Integration',           '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

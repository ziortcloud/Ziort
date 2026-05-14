-- ============================================================
-- Ziort — Migration 010: ZiLoad (Freight Load Board & Marketplace)
-- Product code: ZLD | Tables prefix: zld_
-- Business logic: 100% in TypeScript API — zero RPCs
-- Run after: 009_zifleet.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PROFILES — ZiLoad identity per entity subscription
-- Role determines what actions the entity can perform:
--   shipper     → post loads, accept bids, manage bookings as shipper
--   transporter → post trucks, bid on loads, manage bookings as transporter
--   agency      → both sides (post loads on behalf of shippers, assign transporters)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'transporter'
                    CHECK (role IN ('shipper','transporter','agency')),
  company_name    TEXT NOT NULL,
  gstin           TEXT,
  city            TEXT,
  state           TEXT,
  contact_name    TEXT,
  contact_mobile  TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  logo_url        TEXT,
  -- Aggregate stats (trigger-maintained)
  total_loads_posted  INTEGER NOT NULL DEFAULT 0,
  total_bookings      INTEGER NOT NULL DEFAULT 0,
  avg_rating          NUMERIC(3,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zld_profiles_entity ON zld_profiles(entity_id);
CREATE INDEX IF NOT EXISTS idx_zld_profiles_role   ON zld_profiles(role, city);

-- ─────────────────────────────────────────────────────────────
-- LOADS — freight requirements posted on the load board
-- Visible to all ZiLoad participants (OPEN status)
-- Status: OPEN → MATCHED (bid accepted) → BOOKED → IN_TRANSIT → DELIVERED → CLOSED | CANCELLED | EXPIRED
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_loads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,             -- LD26A01
  entity_id             UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id       UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  -- Route
  origin_city           TEXT NOT NULL,
  origin_address        TEXT,
  dest_city             TEXT NOT NULL,
  dest_address          TEXT,
  via_cities            TEXT[],

  -- Schedule
  pickup_date           DATE NOT NULL,
  required_by_date      DATE,

  -- Cargo
  material_type         TEXT NOT NULL,
  weight_tons           NUMERIC(8,2),
  dimensions            TEXT,
  declared_value_paise  BIGINT NOT NULL DEFAULT 0,
  special_handling      TEXT,

  -- Requirements
  vehicle_type          TEXT CHECK (vehicle_type IN ('LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','ANY')),
  min_capacity_tons     NUMERIC(6,2),

  -- Financials
  budget_paise          BIGINT,                    -- shipper's target (optional)
  payment_terms         TEXT NOT NULL DEFAULT 'NET_30'
                          CHECK (payment_terms IN ('ADVANCE','COD','NET_7','NET_15','NET_30')),
  po_reference          TEXT,

  -- Bid counters (trigger-maintained)
  bid_count             INTEGER NOT NULL DEFAULT 0,
  lowest_bid_paise      BIGINT,

  -- Status
  status                TEXT NOT NULL DEFAULT 'OPEN'
                          CHECK (status IN ('OPEN','MATCHED','BOOKED','IN_TRANSIT','DELIVERED','CLOSED','CANCELLED','EXPIRED')),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',

  created_by            UUID NOT NULL REFERENCES zi_individuals(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zld_loads_status    ON zld_loads(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_zld_loads_origin    ON zld_loads(origin_city, status);
CREATE INDEX IF NOT EXISTS idx_zld_loads_dest      ON zld_loads(dest_city, status);
CREATE INDEX IF NOT EXISTS idx_zld_loads_pickup    ON zld_loads(pickup_date);
CREATE INDEX IF NOT EXISTS idx_zld_loads_entity    ON zld_loads(entity_id);

-- ─────────────────────────────────────────────────────────────
-- TRUCKS — available truck postings by transporters
-- Transporters advertise availability on the truck board.
-- Can be linked to a ZiFleet vehicle via zft_vehicle_id.
-- Status: AVAILABLE → BOOKED → UNAVAILABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_trucks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL,                  -- TP26A01
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  -- ZiFleet integration (optional)
  zft_vehicle_id   UUID REFERENCES zft_vehicles(id) ON DELETE SET NULL,

  vehicle_type     TEXT NOT NULL CHECK (vehicle_type IN ('LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER')),
  capacity_tons    NUMERIC(6,2),
  reg_number       TEXT,

  current_city     TEXT NOT NULL,
  available_from   DATE NOT NULL DEFAULT CURRENT_DATE,
  available_until  DATE,
  dest_preference  TEXT,                           -- preferred route/destination

  -- Rate
  rate_paise       BIGINT,
  rate_type        TEXT NOT NULL DEFAULT 'PER_TRIP'
                     CHECK (rate_type IN ('PER_TRIP','PER_TON','PER_KM')),

  status           TEXT NOT NULL DEFAULT 'AVAILABLE'
                     CHECK (status IN ('AVAILABLE','BOOKED','UNAVAILABLE')),

  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zld_trucks_city    ON zld_trucks(current_city, status);
CREATE INDEX IF NOT EXISTS idx_zld_trucks_entity  ON zld_trucks(entity_id);
CREATE INDEX IF NOT EXISTS idx_zld_trucks_type    ON zld_trucks(vehicle_type, status);

-- ─────────────────────────────────────────────────────────────
-- BIDS — transporter bids on posted loads
-- One bid per transporter per load. Acceptance creates a booking.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_bids (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id          UUID NOT NULL REFERENCES zld_loads(id) ON DELETE CASCADE,
  bidder_entity_id UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  truck_id         UUID REFERENCES zld_trucks(id) ON DELETE SET NULL,

  amount_paise     BIGINT NOT NULL CHECK (amount_paise > 0),
  note             TEXT,

  status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED')),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '48 hours',

  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (load_id, bidder_entity_id)
);
CREATE INDEX IF NOT EXISTS idx_zld_bids_load    ON zld_bids(load_id, status);
CREATE INDEX IF NOT EXISTS idx_zld_bids_bidder  ON zld_bids(bidder_entity_id);

-- ─────────────────────────────────────────────────────────────
-- BOOKINGS — confirmed freight assignment
-- Created when a bid is accepted or a direct booking is made.
-- booking_status mirrors ZiFleet trip status for consistency.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_bookings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                 TEXT NOT NULL,            -- BK26A01
  load_id                 UUID REFERENCES zld_loads(id) ON DELETE RESTRICT,
  bid_id                  UUID REFERENCES zld_bids(id) ON DELETE SET NULL,

  shipper_entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  transporter_entity_id   UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  truck_id                UUID REFERENCES zld_trucks(id) ON DELETE SET NULL,

  -- Financials
  freight_paise           BIGINT NOT NULL CHECK (freight_paise > 0),
  advance_paise           BIGINT NOT NULL DEFAULT 0,
  advance_paid_at         TIMESTAMPTZ,
  payment_status          TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK (payment_status IN ('PENDING','PARTIAL','PAID','OVERDUE')),

  -- Delivery confirmation
  delivery_otp_hash       TEXT,                     -- SHA-256 of 6-digit OTP
  delivery_otp_expires_at TIMESTAMPTZ,
  otp_verified_at         TIMESTAMPTZ,

  -- Status
  booking_status          TEXT NOT NULL DEFAULT 'CONFIRMED'
                            CHECK (booking_status IN ('CONFIRMED','LOADING','IN_TRANSIT','UNLOADING','DELIVERED','CLOSED','CANCELLED')),

  -- Documents
  lr_number               TEXT,
  lr_url                  TEXT,
  pod_url                 TEXT,
  pod_photo_url           TEXT,

  -- ZiFleet bridge — auto-created trip when transporter uses ZiFleet
  zft_trip_id             UUID REFERENCES zft_trips(id) ON DELETE SET NULL,

  tracking_token          TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  notes                   TEXT,

  subscription_id         UUID NOT NULL REFERENCES zi_subscriptions(id),
  created_by              UUID NOT NULL REFERENCES zi_individuals(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code)
);

CREATE INDEX IF NOT EXISTS idx_zld_bookings_shipper     ON zld_bookings(shipper_entity_id);
CREATE INDEX IF NOT EXISTS idx_zld_bookings_transporter ON zld_bookings(transporter_entity_id);
CREATE INDEX IF NOT EXISTS idx_zld_bookings_status      ON zld_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_zld_bookings_tracking    ON zld_bookings(tracking_token);
CREATE INDEX IF NOT EXISTS idx_zld_bookings_load        ON zld_bookings(load_id);

-- ─────────────────────────────────────────────────────────────
-- BOOKING UPDATES — status timeline for bookings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_booking_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES zld_bookings(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL REFERENCES zi_entities(id),
  status      TEXT NOT NULL,
  note        TEXT,
  lat         NUMERIC(10,7),
  lng         NUMERIC(10,7),
  actor_role  TEXT CHECK (actor_role IN ('SHIPPER','TRANSPORTER','AGENCY','SYSTEM')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zld_updates_booking ON zld_booking_updates(booking_id, recorded_at);

-- ─────────────────────────────────────────────────────────────
-- MESSAGES — in-booking chat between shipper and transporter
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES zld_bookings(id) ON DELETE CASCADE,
  sender_entity_id UUID NOT NULL REFERENCES zi_entities(id),
  sender_role    TEXT NOT NULL CHECK (sender_role IN ('SHIPPER','TRANSPORTER','AGENCY')),
  body           TEXT NOT NULL,
  attachment_url TEXT,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zld_messages_booking ON zld_messages(booking_id, sent_at);
ALTER PUBLICATION supabase_realtime ADD TABLE zld_messages;

-- ─────────────────────────────────────────────────────────────
-- RATE CARDS — transporter's standard rates per route
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_rate_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  origin_city      TEXT NOT NULL,
  dest_city        TEXT NOT NULL,
  vehicle_type     TEXT NOT NULL,
  rate_per_ton     BIGINT NOT NULL CHECK (rate_per_ton > 0),
  min_weight_tons  NUMERIC(6,2) NOT NULL DEFAULT 1,
  max_weight_tons  NUMERIC(6,2),
  effective_from   DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to     DATE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, origin_city, dest_city, vehicle_type, effective_from)
);
CREATE INDEX IF NOT EXISTS idx_zld_rate_route ON zld_rate_cards(origin_city, dest_city, vehicle_type, is_active);

-- ─────────────────────────────────────────────────────────────
-- RATINGS — mutual post-delivery ratings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zld_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES zld_bookings(id) ON DELETE CASCADE,
  rater_entity_id  UUID NOT NULL REFERENCES zi_entities(id),
  ratee_entity_id  UUID NOT NULL REFERENCES zi_entities(id),
  rater_role       TEXT NOT NULL CHECK (rater_role IN ('SHIPPER','TRANSPORTER')),
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, rater_entity_id)
);
CREATE INDEX IF NOT EXISTS idx_zld_ratings_ratee ON zld_ratings(ratee_entity_id);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER tg_zld_profiles_updated_at
  BEFORE UPDATE ON zld_profiles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zld_loads_updated_at
  BEFORE UPDATE ON zld_loads    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zld_trucks_updated_at
  BEFORE UPDATE ON zld_trucks   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zld_bids_updated_at
  BEFORE UPDATE ON zld_bids     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zld_bookings_updated_at
  BEFORE UPDATE ON zld_bookings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- When a bid is inserted → increment load.bid_count + update lowest_bid_paise
CREATE OR REPLACE FUNCTION fn_zld_on_bid_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zld_loads SET
    bid_count        = bid_count + 1,
    lowest_bid_paise = CASE
      WHEN lowest_bid_paise IS NULL OR NEW.amount_paise < lowest_bid_paise
      THEN NEW.amount_paise
      ELSE lowest_bid_paise
    END,
    updated_at = now()
  WHERE id = NEW.load_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zld_bid_insert
  AFTER INSERT ON zld_bids
  FOR EACH ROW EXECUTE FUNCTION fn_zld_on_bid_insert();

-- When a booking is created → update profile booking counts
CREATE OR REPLACE FUNCTION fn_zld_on_booking_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zld_profiles SET
    total_bookings = total_bookings + 1,
    updated_at     = now()
  WHERE entity_id IN (NEW.shipper_entity_id, NEW.transporter_entity_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zld_booking_insert
  AFTER INSERT ON zld_bookings
  FOR EACH ROW EXECUTE FUNCTION fn_zld_on_booking_insert();

-- When a rating is submitted → recalculate ratee avg_rating
CREATE OR REPLACE FUNCTION fn_zld_on_rating_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_avg NUMERIC(3,2);
BEGIN
  SELECT ROUND(AVG(rating)::NUMERIC, 2) INTO new_avg
  FROM zld_ratings WHERE ratee_entity_id = NEW.ratee_entity_id;

  UPDATE zld_profiles SET avg_rating = new_avg, updated_at = now()
  WHERE entity_id = NEW.ratee_entity_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zld_rating_insert
  AFTER INSERT ON zld_ratings
  FOR EACH ROW EXECUTE FUNCTION fn_zld_on_rating_insert();

-- When a load is posted → increment poster's total_loads_posted
CREATE OR REPLACE FUNCTION fn_zld_on_load_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zld_profiles SET
    total_loads_posted = total_loads_posted + 1,
    updated_at         = now()
  WHERE entity_id = NEW.entity_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zld_load_insert
  AFTER INSERT ON zld_loads
  FOR EACH ROW EXECUTE FUNCTION fn_zld_on_load_insert();

-- RLS — deny all; API uses service role
ALTER TABLE zld_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_loads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_trucks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_bids           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_booking_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_rate_cards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zld_ratings        ENABLE ROW LEVEL SECURITY;

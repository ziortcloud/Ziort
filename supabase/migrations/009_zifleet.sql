-- ============================================================
-- Ziort — Migration 009: ZiFleet (Fleet & Trip Management)
-- Product code: ZFT | Tables prefix: zft_
-- Business logic: 100% in TypeScript API — zero RPCs
-- Run after: 008_zipulse.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- VEHICLES — fleet of trucks, tankers, tippers, etc.
-- Status machine: AVAILABLE → ON_TRIP → AVAILABLE
--                 AVAILABLE → MAINTENANCE → AVAILABLE
--                 Any → OFF_ROAD (manual only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL,            -- ZFVA01
  entity_id           UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id     UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  reg_number          TEXT NOT NULL,            -- MH12AB1234
  vehicle_type        TEXT NOT NULL DEFAULT 'HCV'
                        CHECK (vehicle_type IN ('LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER')),
  make                TEXT,
  model               TEXT,
  manufacture_year    INTEGER,
  capacity_tons       NUMERIC(6,2),
  capacity_cbm        NUMERIC(6,2),

  -- Compliance docs & expiry dates
  insurance_expiry    DATE,
  fitness_expiry      DATE,
  permit_expiry       DATE,
  puc_expiry          DATE,
  rc_url              TEXT,
  insurance_url       TEXT,

  -- Status (trigger-maintained on trip state changes)
  status              TEXT NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE','ON_TRIP','MAINTENANCE','OFF_ROAD')),

  -- Running counters (trigger-maintained)
  total_trips         INTEGER NOT NULL DEFAULT 0,
  total_km_run        INTEGER NOT NULL DEFAULT 0,
  total_fuel_litres   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_expense_paise BIGINT  NOT NULL DEFAULT 0,

  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID NOT NULL REFERENCES zi_individuals(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, reg_number),
  UNIQUE (subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zft_vehicles_entity ON zft_vehicles(entity_id);
CREATE INDEX IF NOT EXISTS idx_zft_vehicles_status ON zft_vehicles(entity_id, status);

-- ─────────────────────────────────────────────────────────────
-- DRIVERS — drivers assigned to vehicles/trips
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_drivers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL,            -- ZFDA01
  entity_id           UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id     UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  full_name           TEXT NOT NULL,
  mobile_hash         TEXT NOT NULL,            -- SHA-256
  mobile_last4        TEXT NOT NULL,
  aadhaar_last4       TEXT,
  license_no          TEXT,
  license_expiry      DATE,
  photo_url           TEXT,
  license_url         TEXT,
  emergency_name      TEXT,
  emergency_mobile    TEXT,

  status              TEXT NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE','ON_TRIP','ON_LEAVE','INACTIVE')),

  -- Running counters (trigger-maintained)
  total_trips         INTEGER NOT NULL DEFAULT 0,
  total_km_driven     INTEGER NOT NULL DEFAULT 0,

  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID NOT NULL REFERENCES zi_individuals(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code),
  UNIQUE (subscription_id, mobile_hash)
);
CREATE INDEX IF NOT EXISTS idx_zft_drivers_entity ON zft_drivers(entity_id);
CREATE INDEX IF NOT EXISTS idx_zft_drivers_status ON zft_drivers(entity_id, status);

-- ─────────────────────────────────────────────────────────────
-- TRIPS — freight trip (order fulfilment unit)
-- Status: CREATED → LOADING → WAITING → IN_TRANSIT → UNLOADING → DELIVERED → CLOSED | CANCELLED
-- Payment: PENDING → PARTIAL → RECEIVED
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_trips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL,            -- TR26A01
  entity_id           UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id     UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id           UUID REFERENCES zi_branches(id),
  vehicle_id          UUID REFERENCES zft_vehicles(id) ON DELETE SET NULL,
  driver_id           UUID REFERENCES zft_drivers(id) ON DELETE SET NULL,

  -- Route
  origin              TEXT NOT NULL,
  destination         TEXT NOT NULL,
  via_points          TEXT[],                   -- intermediate stops

  -- Client
  client_name         TEXT,
  client_phone        TEXT,
  client_ref          TEXT,                     -- consignor reference / PO number

  -- Cargo
  cargo_type          TEXT,
  cargo_desc          TEXT,
  weight_tons         NUMERIC(8,2),

  -- Financials (all paise)
  freight_paise       BIGINT NOT NULL DEFAULT 0,   -- total agreed freight
  advance_paise       BIGINT NOT NULL DEFAULT 0,   -- advance paid to driver
  received_paise      BIGINT NOT NULL DEFAULT 0,   -- trigger-maintained from payments
  expense_paise       BIGINT NOT NULL DEFAULT 0,   -- trigger-maintained from expenses
  fuel_cost_paise     BIGINT NOT NULL DEFAULT 0,   -- trigger-maintained from fuel logs

  -- Odometer
  start_odo           INTEGER,
  end_odo             INTEGER,

  -- Status
  status              TEXT NOT NULL DEFAULT 'CREATED'
                        CHECK (status IN ('CREATED','LOADING','WAITING','IN_TRANSIT','UNLOADING','DELIVERED','CLOSED','CANCELLED')),
  payment_status      TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (payment_status IN ('PENDING','PARTIAL','RECEIVED')),

  -- Timestamps
  planned_start       TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,

  -- Documents
  tracking_token      TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  lr_number           TEXT,                     -- lorry receipt number
  lr_url              TEXT,
  pod_url             TEXT,                     -- proof of delivery

  -- Cross-product source tracking
  source_type         TEXT NOT NULL DEFAULT 'MANUAL'
                        CHECK (source_type IN ('MANUAL','ZILOAD','ZIBUILD')),
  source_id           UUID,

  notes               TEXT,
  created_by          UUID NOT NULL REFERENCES zi_individuals(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, zi_code)
);
CREATE INDEX IF NOT EXISTS idx_zft_trips_entity   ON zft_trips(entity_id);
CREATE INDEX IF NOT EXISTS idx_zft_trips_sub      ON zft_trips(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zft_trips_status   ON zft_trips(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_zft_trips_vehicle  ON zft_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_zft_trips_driver   ON zft_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_zft_trips_tracking ON zft_trips(tracking_token);
CREATE INDEX IF NOT EXISTS idx_zft_trips_date     ON zft_trips(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TRIP TIMELINE — status-change audit trail + GPS snapshot
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_trip_timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES zft_trips(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL REFERENCES zi_entities(id),
  status      TEXT NOT NULL,
  note        TEXT,
  actor_role  TEXT CHECK (actor_role IN ('OWNER','DRIVER','SYSTEM')),
  lat         NUMERIC(10,7),
  lng         NUMERIC(10,7),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zft_timeline_trip ON zft_trip_timeline(trip_id, recorded_at);

-- ─────────────────────────────────────────────────────────────
-- GPS LOCATIONS — real-time tracking trail from driver's phone
-- Realtime enabled for live map updates
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES zft_trips(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL REFERENCES zi_entities(id),
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  speed_kmh   NUMERIC(5,1),
  heading_deg INTEGER,
  accuracy_m  NUMERIC(6,1),
  battery_pct INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zft_locations_trip ON zft_locations(trip_id, recorded_at DESC);

-- Realtime for live map tracking
ALTER PUBLICATION supabase_realtime ADD TABLE zft_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE zft_trip_timeline;

-- ─────────────────────────────────────────────────────────────
-- FUEL LOGS — fuel fills per trip/vehicle
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_fuel_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID REFERENCES zft_trips(id) ON DELETE SET NULL,
  vehicle_id    UUID NOT NULL REFERENCES zft_vehicles(id) ON DELETE CASCADE,
  entity_id     UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  litres        NUMERIC(8,2) NOT NULL CHECK (litres > 0),
  rate_paise    BIGINT NOT NULL CHECK (rate_paise > 0),   -- price per litre in paise
  amount_paise  BIGINT NOT NULL CHECK (amount_paise > 0), -- total cost
  odometer      INTEGER,
  station       TEXT,
  logged_by     UUID NOT NULL REFERENCES zi_individuals(id),
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zft_fuel_trip    ON zft_fuel_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_zft_fuel_vehicle ON zft_fuel_logs(vehicle_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_zft_fuel_entity  ON zft_fuel_logs(entity_id, logged_at DESC);

-- ─────────────────────────────────────────────────────────────
-- EXPENSES — trip operating expenses (toll, tyre, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID REFERENCES zft_trips(id) ON DELETE SET NULL,
  vehicle_id      UUID REFERENCES zft_vehicles(id) ON DELETE SET NULL,
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  category        TEXT NOT NULL DEFAULT 'OTHER'
                    CHECK (category IN ('TOLL','TYRE_REPAIR','DRIVER_SALARY','FOOD','LOADING_LABOUR','POLICE','PARKING','BROKER_FEE','DETENTION','OTHER')),
  amount_paise    BIGINT NOT NULL CHECK (amount_paise > 0),
  notes           TEXT,
  receipt_url     TEXT,
  logged_by       UUID NOT NULL REFERENCES zi_individuals(id),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zft_expenses_trip    ON zft_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_zft_expenses_entity  ON zft_expenses(entity_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_zft_expenses_vehicle ON zft_expenses(vehicle_id);

-- ─────────────────────────────────────────────────────────────
-- TRIP PAYMENTS — freight payments received from client
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_trip_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES zft_trips(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  amount_paise    BIGINT NOT NULL CHECK (amount_paise > 0),
  mode            TEXT NOT NULL CHECK (mode IN ('CASH','UPI','BANK_TRANSFER','CHEQUE')),
  reference       TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  received_by     UUID NOT NULL REFERENCES zi_individuals(id)
);
CREATE INDEX IF NOT EXISTS idx_zft_payments_trip   ON zft_trip_payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_zft_payments_entity ON zft_trip_payments(entity_id, received_at DESC);

-- ─────────────────────────────────────────────────────────────
-- MAINTENANCE LOGS — vehicle service records
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zft_maintenance_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID NOT NULL REFERENCES zft_vehicles(id) ON DELETE CASCADE,
  entity_id           UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id     UUID NOT NULL REFERENCES zi_subscriptions(id),
  service_type        TEXT NOT NULL
                        CHECK (service_type IN ('OIL_CHANGE','TYRE_REPLACEMENT','BRAKE_SERVICE','ENGINE_REPAIR','GEARBOX','ELECTRICAL','BODY_WORK','AC_SERVICE','GENERAL_SERVICE','INSPECTION')),
  description         TEXT,
  odometer            INTEGER,
  amount_paise        BIGINT NOT NULL DEFAULT 0,
  parts_cost_paise    BIGINT NOT NULL DEFAULT 0,
  labour_cost_paise   BIGINT NOT NULL DEFAULT 0,
  vendor_name         TEXT,
  vendor_phone        TEXT,
  service_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  next_service_km     INTEGER,
  next_service_date   DATE,
  logged_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zft_maint_vehicle ON zft_maintenance_logs(vehicle_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_zft_maint_entity  ON zft_maintenance_logs(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zft_maint_type    ON zft_maintenance_logs(vehicle_id, service_type);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS — counter maintenance and status propagation
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER tg_zft_vehicles_updated_at
  BEFORE UPDATE ON zft_vehicles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zft_drivers_updated_at
  BEFORE UPDATE ON zft_drivers  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zft_trips_updated_at
  BEFORE UPDATE ON zft_trips    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- When a trip status changes:
-- IN_TRANSIT → mark vehicle & driver ON_TRIP, increment total_trips
-- DELIVERED/CLOSED/CANCELLED → mark vehicle & driver AVAILABLE, accumulate km
CREATE OR REPLACE FUNCTION fn_zft_on_trip_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  km_run INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Trip started → set vehicle + driver to ON_TRIP
  IF NEW.status = 'IN_TRANSIT' THEN
    IF NEW.vehicle_id IS NOT NULL THEN
      UPDATE zft_vehicles SET status = 'ON_TRIP', updated_at = now() WHERE id = NEW.vehicle_id;
    END IF;
    IF NEW.driver_id IS NOT NULL THEN
      UPDATE zft_drivers SET status = 'ON_TRIP', updated_at = now() WHERE id = NEW.driver_id;
    END IF;
  END IF;

  -- Trip ended (delivered/closed/cancelled) → free vehicle + driver, tally km
  IF NEW.status IN ('DELIVERED','CLOSED','CANCELLED') THEN
    km_run := COALESCE(NEW.end_odo, 0) - COALESCE(NEW.start_odo, 0);
    IF km_run < 0 THEN km_run := 0; END IF;

    IF NEW.vehicle_id IS NOT NULL THEN
      UPDATE zft_vehicles SET
        status         = 'AVAILABLE',
        total_trips    = total_trips + CASE WHEN NEW.status != 'CANCELLED' THEN 1 ELSE 0 END,
        total_km_run   = total_km_run + km_run,
        updated_at     = now()
      WHERE id = NEW.vehicle_id;
    END IF;

    IF NEW.driver_id IS NOT NULL THEN
      UPDATE zft_drivers SET
        status          = 'AVAILABLE',
        total_trips     = total_trips + CASE WHEN NEW.status != 'CANCELLED' THEN 1 ELSE 0 END,
        total_km_driven = total_km_driven + km_run,
        updated_at      = now()
      WHERE id = NEW.driver_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zft_trip_status_change
  AFTER UPDATE OF status ON zft_trips
  FOR EACH ROW EXECUTE FUNCTION fn_zft_on_trip_status_change();

-- When a fuel log is inserted → update trip.fuel_cost_paise + vehicle.total_fuel_litres
CREATE OR REPLACE FUNCTION fn_zft_on_fuel_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.trip_id IS NOT NULL THEN
    UPDATE zft_trips SET
      fuel_cost_paise = fuel_cost_paise + NEW.amount_paise,
      updated_at      = now()
    WHERE id = NEW.trip_id;
  END IF;

  UPDATE zft_vehicles SET
    total_fuel_litres   = total_fuel_litres + NEW.litres,
    total_expense_paise = total_expense_paise + NEW.amount_paise,
    updated_at          = now()
  WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zft_fuel_insert
  AFTER INSERT ON zft_fuel_logs
  FOR EACH ROW EXECUTE FUNCTION fn_zft_on_fuel_insert();

-- When an expense is inserted → update trip.expense_paise + vehicle.total_expense_paise
CREATE OR REPLACE FUNCTION fn_zft_on_expense_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.trip_id IS NOT NULL THEN
    UPDATE zft_trips SET
      expense_paise = expense_paise + NEW.amount_paise,
      updated_at    = now()
    WHERE id = NEW.trip_id;
  END IF;

  IF NEW.vehicle_id IS NOT NULL THEN
    UPDATE zft_vehicles SET
      total_expense_paise = total_expense_paise + NEW.amount_paise,
      updated_at          = now()
    WHERE id = NEW.vehicle_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zft_expense_insert
  AFTER INSERT ON zft_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_zft_on_expense_insert();

-- When a payment is inserted → update trip.received_paise + payment_status
CREATE OR REPLACE FUNCTION fn_zft_on_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_received BIGINT;
  new_status   TEXT;
BEGIN
  UPDATE zft_trips SET
    received_paise = received_paise + NEW.amount_paise,
    updated_at     = now()
  WHERE id = NEW.trip_id
  RETURNING received_paise INTO new_received;

  SELECT CASE
    WHEN new_received >= freight_paise THEN 'RECEIVED'
    WHEN new_received > 0              THEN 'PARTIAL'
    ELSE 'PENDING'
  END INTO new_status
  FROM zft_trips WHERE id = NEW.trip_id;

  UPDATE zft_trips SET payment_status = new_status WHERE id = NEW.trip_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tg_zft_payment_insert
  AFTER INSERT ON zft_trip_payments
  FOR EACH ROW EXECUTE FUNCTION fn_zft_on_payment_insert();

-- RLS — deny all; API uses service role
ALTER TABLE zft_vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_drivers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_trips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_trip_timeline    ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_locations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_fuel_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_trip_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE zft_maintenance_logs ENABLE ROW LEVEL SECURITY;

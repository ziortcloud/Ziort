-- ZiPulse Database Schema
-- Product: ZPLS | All tables scoped by entity_id + subscription_id

-- ─────────────────────────────────────────────
-- ZPLS Patients (CST prefix)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpls_patients (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                         TEXT NOT NULL UNIQUE,
  ref_code                        TEXT NOT NULL UNIQUE,
  entity_id                       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id                 UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id                       UUID NOT NULL REFERENCES zi_branches(id) ON DELETE RESTRICT,
  full_name                       TEXT NOT NULL,
  date_of_birth                   DATE,
  gender                          TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  mobile_hash                     TEXT NOT NULL,
  mobile_last4                    TEXT NOT NULL,
  email                           TEXT,
  blood_group                     TEXT,
  allergies                       TEXT[],
  address                         TEXT,
  city                            TEXT,
  state                           TEXT,
  country_code                    TEXT NOT NULL DEFAULT 'IN',
  emergency_contact_name          TEXT,
  emergency_contact_mobile_hash   TEXT,
  emergency_contact_mobile_last4  TEXT,
  status                          TEXT NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','inactive','blacklisted')),
  notes                           TEXT,
  created_by                      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpls_patients_entity  ON zpls_patients(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpls_patients_mobile  ON zpls_patients(mobile_hash);

-- ─────────────────────────────────────────────
-- ZPLS Doctors / Practitioners
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpls_doctors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                 TEXT NOT NULL UNIQUE,
  ref_code                TEXT NOT NULL UNIQUE,
  entity_id               UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id         UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  individual_id           UUID REFERENCES zi_individuals(id),
  full_name               TEXT NOT NULL,
  specialization          TEXT NOT NULL,
  qualification           TEXT NOT NULL,
  registration_number     TEXT,
  consultation_fee_paise  BIGINT NOT NULL DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by              UUID NOT NULL REFERENCES zi_individuals(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpls_doctors_entity ON zpls_doctors(entity_id);

-- ─────────────────────────────────────────────
-- ZPLS Appointments (THR prefix → THR26A01)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpls_appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL UNIQUE,
  ref_code          TEXT NOT NULL UNIQUE,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id   UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id         UUID NOT NULL REFERENCES zi_branches(id) ON DELETE RESTRICT,
  patient_id        UUID NOT NULL REFERENCES zpls_patients(id) ON DELETE RESTRICT,
  doctor_id         UUID NOT NULL REFERENCES zpls_doctors(id) ON DELETE RESTRICT,
  appointment_type  TEXT NOT NULL CHECK (appointment_type IN ('consultation','follow_up','procedure','test','emergency')),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 30,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
  chief_complaint   TEXT,
  diagnosis         TEXT,
  prescription      TEXT,
  follow_up_date    DATE,
  fee_paise         BIGINT NOT NULL DEFAULT 0,
  paid_paise        BIGINT NOT NULL DEFAULT 0,
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES zi_individuals(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpls_appointments_entity    ON zpls_appointments(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpls_appointments_patient   ON zpls_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_zpls_appointments_doctor    ON zpls_appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_zpls_appointments_scheduled ON zpls_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_zpls_appointments_status    ON zpls_appointments(status);

-- ─────────────────────────────────────────────
-- ZPLS Enquiries (ENQ prefix → ENQ26A01)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zpls_enquiries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  full_name        TEXT NOT NULL,
  mobile_hash      TEXT NOT NULL,
  mobile_last4     TEXT NOT NULL,
  enquiry_text     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','followed_up','converted','closed')),
  converted_to     UUID REFERENCES zpls_patients(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpls_enquiries_entity ON zpls_enquiries(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpls_enquiries_status ON zpls_enquiries(status);

CREATE OR REPLACE TRIGGER tg_zpls_patients_updated_at
  BEFORE UPDATE ON zpls_patients FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpls_doctors_updated_at
  BEFORE UPDATE ON zpls_doctors FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpls_appointments_updated_at
  BEFORE UPDATE ON zpls_appointments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpls_enquiries_updated_at
  BEFORE UPDATE ON zpls_enquiries FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

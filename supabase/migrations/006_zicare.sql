-- ============================================================
-- Ziort — Migration 006: ZiCare (Clinic / Healthcare CRM)
-- Product code: ZCR
-- Run after: 005_zipawn.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ZCR Patients
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zcr_patients (
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
  allergies                       TEXT[] NOT NULL DEFAULT '{}',
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
CREATE INDEX IF NOT EXISTS idx_zcr_patients_entity ON zcr_patients(entity_id);
CREATE INDEX IF NOT EXISTS idx_zcr_patients_sub    ON zcr_patients(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zcr_patients_mobile ON zcr_patients(mobile_hash);

-- ─────────────────────────────────────────────────────────────
-- ZCR Doctors / Practitioners
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zcr_doctors (
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
CREATE INDEX IF NOT EXISTS idx_zcr_doctors_entity ON zcr_doctors(entity_id);
CREATE INDEX IF NOT EXISTS idx_zcr_doctors_sub    ON zcr_doctors(subscription_id);

-- ─────────────────────────────────────────────────────────────
-- ZCR Appointments (APT prefix → APT26A01 year-scoped)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zcr_appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL UNIQUE,
  ref_code          TEXT NOT NULL UNIQUE,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id   UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id         UUID NOT NULL REFERENCES zi_branches(id) ON DELETE RESTRICT,
  patient_id        UUID NOT NULL REFERENCES zcr_patients(id) ON DELETE RESTRICT,
  doctor_id         UUID NOT NULL REFERENCES zcr_doctors(id) ON DELETE RESTRICT,
  appointment_type  TEXT NOT NULL
                      CHECK (appointment_type IN ('consultation','follow_up','procedure','test','emergency')),
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
CREATE INDEX IF NOT EXISTS idx_zcr_appointments_entity    ON zcr_appointments(entity_id);
CREATE INDEX IF NOT EXISTS idx_zcr_appointments_patient   ON zcr_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_zcr_appointments_doctor    ON zcr_appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_zcr_appointments_scheduled ON zcr_appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_zcr_appointments_status    ON zcr_appointments(status);

-- ─────────────────────────────────────────────────────────────
-- ZCR Enquiries (walk-ins / prospects not yet patients)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zcr_enquiries (
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
  converted_to     UUID REFERENCES zcr_patients(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zcr_enquiries_entity ON zcr_enquiries(entity_id);
CREATE INDEX IF NOT EXISTS idx_zcr_enquiries_status ON zcr_enquiries(status);

-- ─────────────────────────────────────────────────────────────
-- Triggers (fn_set_updated_at already created in 005_zipawn)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER tg_zcr_patients_updated_at
  BEFORE UPDATE ON zcr_patients     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zcr_doctors_updated_at
  BEFORE UPDATE ON zcr_doctors      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zcr_appointments_updated_at
  BEFORE UPDATE ON zcr_appointments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zcr_enquiries_updated_at
  BEFORE UPDATE ON zcr_enquiries    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zcr_patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcr_doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcr_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcr_enquiries    ENABLE ROW LEVEL SECURITY;
CREATE POLICY zcr_patients_deny_all     ON zcr_patients     FOR ALL USING (false);
CREATE POLICY zcr_doctors_deny_all      ON zcr_doctors      FOR ALL USING (false);
CREATE POLICY zcr_appointments_deny_all ON zcr_appointments FOR ALL USING (false);
CREATE POLICY zcr_enquiries_deny_all    ON zcr_enquiries    FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- ZiCare feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZCR', 'zicare_sms_reminder',    'Appointment SMS Reminders', '["solo","plus","pro"]'),
  ('ZCR', 'zicare_prescription_pdf','Prescription PDF Export',   '["plus","pro"]'),
  ('ZCR', 'zicare_multi_doctor',    'Multiple Doctors',          '["plus","pro"]'),
  ('ZCR', 'zicare_inventory',       'Pharmacy Inventory',        '["pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

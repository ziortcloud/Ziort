-- ============================================================
-- Ziort — COMBINED MIGRATION
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- Project: jzkkxsvzunarysvurmtd
-- ============================================================

-- ============================================================
-- MIGRATION 001: CORE SCHEMA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE zi_individuals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT UNIQUE NOT NULL,
  display_name          TEXT NOT NULL,
  country_code          TEXT NOT NULL DEFAULT 'IN',
  national_id_type      TEXT,
  national_id_hash      TEXT,
  national_id_last6     TEXT,
  national_id_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  auth_user_id          UUID UNIQUE,
  avatar_url            TEXT,
  preferred_lang        TEXT NOT NULL DEFAULT 'en',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ
);

CREATE TABLE zi_individual_emails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id     UUID NOT NULL REFERENCES zi_individuals(id),
  email             TEXT NOT NULL,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  became_current_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_at       TIMESTAMPTZ,
  UNIQUE(individual_id, email)
);
CREATE INDEX idx_ind_emails_email       ON zi_individual_emails(email);
CREATE INDEX idx_ind_emails_individual  ON zi_individual_emails(individual_id);

CREATE TABLE zi_individual_mobiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id     UUID NOT NULL REFERENCES zi_individuals(id),
  mobile_hash       TEXT NOT NULL UNIQUE,
  mobile_last4      TEXT NOT NULL,
  country_dial_code TEXT NOT NULL,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  became_current_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_at       TIMESTAMPTZ,
  cooldown_until    TIMESTAMPTZ
);
CREATE INDEX idx_ind_mobiles_hash       ON zi_individual_mobiles(mobile_hash);
CREATE INDEX idx_ind_mobiles_individual ON zi_individual_mobiles(individual_id);

CREATE TABLE zi_entities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT UNIQUE NOT NULL,
  legal_name            TEXT NOT NULL,
  trade_name            TEXT,
  entity_type           TEXT NOT NULL,
  country_code          TEXT NOT NULL DEFAULT 'IN',
  business_id_type      TEXT,
  business_id_hash      TEXT,
  business_id_last6     TEXT,
  business_id_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  city                  TEXT,
  state                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_entity_type CHECK (
    entity_type IN ('sole_proprietor','company','partnership','trust','individual')
  )
);

CREATE TABLE zi_branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code       TEXT NOT NULL,
  entity_id     UUID NOT NULL REFERENCES zi_entities(id),
  ref_code      TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  country_code  TEXT NOT NULL DEFAULT 'IN',
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, zi_code)
);
CREATE INDEX idx_branches_entity ON zi_branches(entity_id);

CREATE TABLE zi_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id),
  ref_code          TEXT UNIQUE NOT NULL,
  product_code      TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  plan_type         TEXT NOT NULL DEFAULT 'trial',
  status            TEXT NOT NULL DEFAULT 'trial',
  trial_start       DATE,
  trial_end         DATE,
  billing_start     DATE,
  is_annual         BOOLEAN NOT NULL DEFAULT FALSE,
  max_users         INT,
  primary_owner_id  UUID REFERENCES zi_individuals(id),
  billing_owner_id  UUID REFERENCES zi_individuals(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, zi_code),
  CONSTRAINT chk_plan_type CHECK (plan_type IN ('trial','solo','plus','pro')),
  CONSTRAINT chk_status    CHECK (status IN ('trial','active','paused','grace','cancelled'))
);
CREATE INDEX idx_subs_entity  ON zi_subscriptions(entity_id);
CREATE INDEX idx_subs_product ON zi_subscriptions(product_code);

CREATE TABLE zi_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code          TEXT UNIQUE NOT NULL,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id),
  individual_id     UUID NOT NULL REFERENCES zi_individuals(id),
  role              TEXT NOT NULL,
  is_primary_owner  BOOLEAN NOT NULL DEFAULT FALSE,
  is_billing_owner  BOOLEAN NOT NULL DEFAULT FALSE,
  equity_percent    NUMERIC(5,2),
  permissions       JSONB,
  branch_access     JSONB,
  invited_by        UUID REFERENCES zi_individuals(id),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, individual_id),
  CONSTRAINT chk_role CHECK (role IN ('owner','co_owner','partner','manager','staff','custom'))
);
CREATE UNIQUE INDEX idx_memberships_primary_owner ON zi_memberships(entity_id) WHERE is_primary_owner = TRUE;
CREATE UNIQUE INDEX idx_memberships_billing_owner ON zi_memberships(entity_id) WHERE is_billing_owner = TRUE;
CREATE INDEX idx_memberships_entity     ON zi_memberships(entity_id);
CREATE INDEX idx_memberships_individual ON zi_memberships(individual_id);

CREATE TABLE zi_biz_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL,
  ref_code         TEXT UNIQUE NOT NULL,
  entity_id        UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id),
  individual_id    UUID REFERENCES zi_individuals(id),
  contact_type     TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  mobile_display   TEXT,
  email_display    TEXT,
  tags             JSONB,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, subscription_id, contact_type, zi_code),
  CONSTRAINT chk_contact_type CHECK (contact_type IN ('CST','SUP','VND','AGT','PTR'))
);
CREATE INDEX idx_biz_contacts_entity     ON zi_biz_contacts(entity_id);
CREATE INDEX idx_biz_contacts_sub        ON zi_biz_contacts(subscription_id);
CREATE INDEX idx_biz_contacts_individual ON zi_biz_contacts(individual_id);

CREATE TABLE zi_national_id_config (
  country_code       TEXT PRIMARY KEY,
  country_name       TEXT NOT NULL,
  individual_id_name TEXT,
  individual_format  TEXT,
  business_id_name   TEXT,
  business_format    TEXT,
  store_raw          BOOLEAN NOT NULL DEFAULT FALSE,
  store_hash         BOOLEAN NOT NULL DEFAULT TRUE,
  display_last       INT NOT NULL DEFAULT 6,
  verify_api         TEXT
);
INSERT INTO zi_national_id_config VALUES
  ('IN','India',      'Aadhaar',    '^\d{12}$',              'GST/CIN/MSME',    NULL,       FALSE,TRUE,6,'https://api.uidai.gov.in'),
  ('US','USA',        'SSN',        '^\d{9}$',               'EIN',             '^\d{9}$',  FALSE,TRUE,6,NULL),
  ('AE','UAE',        'Emirates ID','^\d{15}$',              'Trade License',   NULL,       FALSE,TRUE,6,NULL),
  ('SG','Singapore',  'NRIC',       '^[STFG]\d{7}[A-Z]$',   'UEN',             NULL,       FALSE,TRUE,6,NULL),
  ('GB','UK',         'NI Number',  '^[A-Z]{2}\d{6}[A-Z]$', 'Companies House', NULL,       FALSE,TRUE,6,NULL),
  ('MY','Malaysia',   'MyKad',      '^\d{12}$',              'SSM',             NULL,       FALSE,TRUE,6,NULL);

-- ============================================================
-- MIGRATION 002: CODE SEQUENCES + ALPHA-GROW GENERATOR
-- ============================================================

CREATE TABLE zi_code_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_prefix   TEXT UNIQUE NOT NULL,
  last_sequence TEXT NOT NULL,
  total_issued  BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_increment_alpha(alpha TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  chars  TEXT[];
  i      INT;
  carry  BOOLEAN := TRUE;
  result TEXT := '';
BEGIN
  FOR i IN 1..length(alpha) LOOP
    chars[i] := substring(alpha FROM i FOR 1);
  END LOOP;
  FOR i IN REVERSE 1..array_length(chars, 1) LOOP
    IF carry THEN
      IF chars[i] = 'Z' THEN chars[i] := 'A'; carry := TRUE;
      ELSE chars[i] := chr(ascii(chars[i]) + 1); carry := FALSE;
      END IF;
    END IF;
  END LOOP;
  IF carry THEN result := 'A'; END IF;
  FOR i IN 1..array_length(chars, 1) LOOP result := result || chars[i]; END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_next_code(prefix TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  last_seq   TEXT;
  alpha_part TEXT;
  num_part   INT;
  next_alpha TEXT;
  next_num   TEXT;
  new_code   TEXT;
BEGIN
  SELECT last_sequence INTO last_seq
  FROM zi_code_sequences WHERE code_prefix = prefix FOR UPDATE;

  IF last_seq IS NULL THEN
    new_code := prefix || 'A01';
    INSERT INTO zi_code_sequences (code_prefix, last_sequence, total_issued)
    VALUES (prefix, new_code, 1);
    RETURN new_code;
  END IF;

  alpha_part := regexp_replace(last_seq, '^' || prefix || '([A-Z]+)([0-9]{2})$', '\1');
  num_part   := (regexp_replace(last_seq, '^' || prefix || '([A-Z]+)([0-9]{2})$', '\2'))::INT;

  IF num_part < 99 THEN
    next_num := lpad((num_part + 1)::TEXT, 2, '0'); next_alpha := alpha_part;
  ELSE
    next_num := '01'; next_alpha := fn_increment_alpha(alpha_part);
  END IF;

  new_code := prefix || next_alpha || next_num;
  UPDATE zi_code_sequences
  SET last_sequence = new_code, total_issued = total_issued + 1, updated_at = NOW()
  WHERE code_prefix = prefix;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION fn_next_year_code(prefix TEXT, year_2digit INT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN fn_next_code(prefix || lpad(year_2digit::TEXT, 2, '0'));
END;
$$;

INSERT INTO zi_code_sequences (code_prefix, last_sequence, total_issued) VALUES
  ('ZU',    'ZUA00',    0),  -- Individuals
  ('ZE',    'ZEA00',    0),  -- Entities
  ('ZBR',   'ZBRA00',   0),  -- Branches
  ('ZPN',   'ZPNA00',   0),  -- ZiPawn
  ('ZFLT',  'ZFLTA00',  0),  -- ZiFleet
  ('ZLD',   'ZLDA00',   0),  -- ZiLoad
  ('ZFD',   'ZFDA00',   0),  -- ZiFood
  ('ZCR',   'ZCRA00',   0),  -- ZiCare
  ('ZSHP',  'ZSHPA00',  0),  -- ZiShop
  ('ZCHT',  'ZCHTA00',  0),  -- ZiChit
  ('ZBLD',  'ZBLDA00',  0),  -- ZiBuild
  ('ZYLD',  'ZYLDA00',  0),  -- ZiYield
  ('ZPST',  'ZPSTA00',  0),  -- ZiPost
  ('ZSCN',  'ZSCNA00',  0),  -- ZiScan
  ('ZCLC',  'ZCLCA00',  0),  -- ZiCalc
  ('ZRCP',  'ZRCPA00',  0),  -- ZiReceipt
  ('ZNVC',  'ZNVCA00',  0),  -- ZiInvoice
  ('ZQT',   'ZQTA00',   0),  -- ZiQuote
  ('ZLDG',  'ZLDGA00',  0),  -- ZiLedger
  ('ZPRTN', 'ZPRTNA00', 0),  -- ZiPartner
  ('ZPLS',  'ZPLSA00',  0),  -- ZiPulse
  ('ZND',   'ZNDA00',   0),  -- ZiNeed
  ('CST',   'CSTA00',   0),  -- Customer contacts
  ('SUP',   'SUPA00',   0),  -- Supplier contacts
  ('VND',   'VNDA00',   0),  -- Vendor contacts
  ('AGT',   'AGTA00',   0),  -- Agent contacts
  ('PTR',   'PTRA00',   0);  -- Partner contacts

-- ============================================================
-- MIGRATION 003: BILLING
-- ============================================================

CREATE TABLE zi_wallet (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID UNIQUE NOT NULL REFERENCES zi_entities(id),
  balance_paise  BIGINT NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'INR',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_entity ON zi_wallet(entity_id);

CREATE TABLE zi_billing_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           UUID NOT NULL REFERENCES zi_entities(id),
  transaction_type    TEXT NOT NULL,
  amount_paise        BIGINT NOT NULL,
  description         TEXT NOT NULL,
  ref_code            TEXT,
  balance_after_paise BIGINT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES zi_individuals(id),
  CONSTRAINT chk_tx_type CHECK (transaction_type IN ('debit','credit','refund','adjustment'))
);
CREATE INDEX idx_billing_log_entity  ON zi_billing_log(entity_id);
CREATE INDEX idx_billing_log_created ON zi_billing_log(created_at DESC);

CREATE TABLE zi_billing_snapshot (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID NOT NULL REFERENCES zi_entities(id),
  snapshot_date           DATE NOT NULL,
  product_count           INT NOT NULL DEFAULT 0,
  active_user_count       INT NOT NULL DEFAULT 0,
  branch_count            INT NOT NULL DEFAULT 0,
  bundle_discount_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  base_cost_paise         BIGINT NOT NULL DEFAULT 0,
  discount_paise          BIGINT NOT NULL DEFAULT 0,
  daily_cost_paise        BIGINT NOT NULL DEFAULT 0,
  notification_cost_paise BIGINT NOT NULL DEFAULT 0,
  total_cost_paise        BIGINT NOT NULL DEFAULT 0,
  deducted                BOOLEAN NOT NULL DEFAULT FALSE,
  deducted_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, snapshot_date)
);
CREATE INDEX idx_billing_snapshot_entity ON zi_billing_snapshot(entity_id);
CREATE INDEX idx_billing_snapshot_date   ON zi_billing_snapshot(snapshot_date DESC);

CREATE TABLE zi_topup_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id          UUID NOT NULL REFERENCES zi_entities(id),
  individual_id      UUID NOT NULL REFERENCES zi_individuals(id),
  amount_paise       BIGINT NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'INR',
  gateway            TEXT NOT NULL DEFAULT 'manual',
  gateway_order_id   TEXT,
  gateway_payment_id TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  credited_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_topup_status CHECK (status IN ('pending','success','failed','refunded'))
);
CREATE INDEX idx_topup_entity ON zi_topup_requests(entity_id);

CREATE OR REPLACE FUNCTION fn_debit_wallet(
  p_entity_id UUID, p_amount_paise BIGINT, p_description TEXT,
  p_ref_code TEXT DEFAULT NULL, p_individual_id UUID DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE new_balance BIGINT;
BEGIN
  UPDATE zi_wallet SET balance_paise = balance_paise - p_amount_paise, updated_at = NOW()
  WHERE entity_id = p_entity_id RETURNING balance_paise INTO new_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found for entity %', p_entity_id; END IF;
  INSERT INTO zi_billing_log (entity_id,transaction_type,amount_paise,description,ref_code,balance_after_paise,created_by)
  VALUES (p_entity_id,'debit',p_amount_paise,p_description,p_ref_code,new_balance,p_individual_id);
  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION fn_credit_wallet(
  p_entity_id UUID, p_amount_paise BIGINT, p_description TEXT,
  p_ref_code TEXT DEFAULT NULL, p_individual_id UUID DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE new_balance BIGINT;
BEGIN
  INSERT INTO zi_wallet (entity_id, balance_paise)
  VALUES (p_entity_id, p_amount_paise)
  ON CONFLICT (entity_id)
  DO UPDATE SET balance_paise = zi_wallet.balance_paise + p_amount_paise, updated_at = NOW()
  RETURNING balance_paise INTO new_balance;
  INSERT INTO zi_billing_log (entity_id,transaction_type,amount_paise,description,ref_code,balance_after_paise,created_by)
  VALUES (p_entity_id,'credit',p_amount_paise,p_description,p_ref_code,new_balance,p_individual_id);
  RETURN new_balance;
END;
$$;

-- ============================================================
-- MIGRATION 004: AUDIT LOG + INTEGRATION EVENTS
-- ============================================================

CREATE TABLE zi_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID REFERENCES zi_entities(id),
  individual_id  UUID REFERENCES zi_individuals(id),
  action         TEXT NOT NULL,
  table_name     TEXT NOT NULL,
  record_id      UUID,
  ref_code       TEXT,
  old_value      JSONB,
  new_value      JSONB,
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_action CHECK (
    action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','IMPORT','VIEW')
  )
);
CREATE INDEX idx_audit_entity     ON zi_audit_log(entity_id, created_at DESC);
CREATE INDEX idx_audit_individual ON zi_audit_log(individual_id, created_at DESC);
CREATE INDEX idx_audit_ref_code   ON zi_audit_log(ref_code);
CREATE INDEX idx_audit_table      ON zi_audit_log(table_name, created_at DESC);

CREATE TABLE zi_integration_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product  TEXT NOT NULL,
  target_product  TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  source_ref_code TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INT NOT NULL DEFAULT 0,
  last_error      TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_status CHECK (status IN ('pending','processing','done','failed'))
);
CREATE INDEX idx_int_events_status ON zi_integration_events(status, created_at ASC);
CREATE INDEX idx_int_events_entity ON zi_integration_events(entity_id);
CREATE INDEX idx_int_events_target ON zi_integration_events(target_product, status);

CREATE TABLE zi_notification_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID REFERENCES zi_entities(id),
  individual_id  UUID REFERENCES zi_individuals(id),
  channel        TEXT NOT NULL,
  recipient      TEXT NOT NULL,
  event_key      TEXT NOT NULL,
  subject        TEXT,
  body_preview   TEXT,
  provider       TEXT,
  provider_id    TEXT,
  status         TEXT NOT NULL DEFAULT 'queued',
  cost_paise     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at   TIMESTAMPTZ,
  CONSTRAINT chk_channel CHECK (channel IN ('sms','whatsapp','email','push'))
);
CREATE INDEX idx_notif_entity ON zi_notification_log(entity_id, created_at DESC);

CREATE TABLE zi_feature_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL,
  flag_key     TEXT NOT NULL,
  label        TEXT NOT NULL,
  plan_tiers   JSONB NOT NULL DEFAULT '["trial","solo","plus","pro"]',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  description  TEXT,
  UNIQUE(product_code, flag_key)
);
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('*',    'multi_branch',          'Multiple Branches',         '["plus","pro"]'),
  ('*',    'multi_user',            'Multiple Users',            '["plus","pro"]'),
  ('*',    'api_access',            'API Access',                '["pro"]'),
  ('*',    'advanced_reports',      'Advanced Reports',          '["plus","pro"]'),
  ('*',    'notifications_sms',     'SMS Notifications',         '["solo","plus","pro"]'),
  ('*',    'notifications_wa',      'WhatsApp Notifications',    '["plus","pro"]'),
  ('ZPLS', 'pulse_team_view',       'Team Pulse Dashboard',      '["plus","pro"]'),
  ('ZPLS', 'pulse_ai_suggest',      'AI Follow-up Suggestions',  '["pro"]'),
  ('ZND',  'zineed_featured',       'Featured Supplier Listing', '["plus","pro"]'),
  ('ZND',  'zineed_priority_boost', 'Priority Boost Listing',    '["solo","plus","pro"]');

-- ============================================================
-- MIGRATION 005: ZIPAWN
-- ============================================================

CREATE TABLE IF NOT EXISTS zpn_customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL UNIQUE,
  ref_code          TEXT NOT NULL UNIQUE,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id   UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  full_name         TEXT NOT NULL,
  mobile_hash       TEXT NOT NULL,
  mobile_last4      TEXT NOT NULL,
  email             TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  country_code      TEXT NOT NULL DEFAULT 'IN',
  national_id_type  TEXT,
  national_id_hash  TEXT,
  national_id_last6 TEXT,
  kyc_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID NOT NULL REFERENCES zi_individuals(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_customers_entity ON zpn_customers(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_customers_sub    ON zpn_customers(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zpn_customers_mobile ON zpn_customers(mobile_hash);

CREATE TABLE IF NOT EXISTS zpn_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id              UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id        UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  loan_id                UUID,
  category               TEXT NOT NULL CHECK (category IN ('gold','silver','diamond','electronics','vehicle','property_doc','other')),
  description            TEXT NOT NULL,
  weight_grams           NUMERIC(10,3),
  purity                 TEXT,
  appraised_value_paise  BIGINT NOT NULL,
  market_value_paise     BIGINT NOT NULL,
  images                 TEXT[] NOT NULL DEFAULT '{}',
  condition_notes        TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_by             UUID NOT NULL REFERENCES zi_individuals(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_items_entity  ON zpn_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_items_loan_id ON zpn_items(loan_id);

CREATE TABLE IF NOT EXISTS zpn_loans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,
  ref_code             TEXT NOT NULL UNIQUE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id            UUID NOT NULL REFERENCES zi_branches(id) ON DELETE RESTRICT,
  customer_id          UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,
  principal_paise      BIGINT NOT NULL,
  interest_rate_pct    NUMERIC(6,2) NOT NULL,
  interest_type        TEXT NOT NULL CHECK (interest_type IN ('simple','compound')),
  tenure_months        INTEGER NOT NULL,
  loan_start_date      DATE NOT NULL,
  loan_end_date        DATE NOT NULL,
  total_interest_paise BIGINT NOT NULL DEFAULT 0,
  total_due_paise      BIGINT NOT NULL,
  paid_paise           BIGINT NOT NULL DEFAULT 0,
  outstanding_paise    BIGINT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('pending','active','interest_due','overdue','released','auctioned','written_off')),
  last_interest_date   DATE,
  released_at          TIMESTAMPTZ,
  auctioned_at         TIMESTAMPTZ,
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_entity   ON zpn_loans(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_sub      ON zpn_loans(subscription_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_customer ON zpn_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_status   ON zpn_loans(status);
CREATE INDEX IF NOT EXISTS idx_zpn_loans_end_date ON zpn_loans(loan_end_date);

ALTER TABLE zpn_items ADD CONSTRAINT fk_zpn_items_loan FOREIGN KEY (loan_id) REFERENCES zpn_loans(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS zpn_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  loan_id          UUID NOT NULL REFERENCES zpn_loans(id) ON DELETE RESTRICT,
  customer_id      UUID NOT NULL REFERENCES zpn_customers(id) ON DELETE RESTRICT,
  amount_paise     BIGINT NOT NULL,
  principal_paise  BIGINT NOT NULL DEFAULT 0,
  interest_paise   BIGINT NOT NULL DEFAULT 0,
  payment_date     DATE NOT NULL,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('cash','upi','neft','rtgs','cheque')),
  receipt_number   TEXT,
  created_by       UUID NOT NULL REFERENCES zi_individuals(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpn_payments_entity ON zpn_payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpn_payments_loan   ON zpn_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_zpn_payments_date   ON zpn_payments(payment_date DESC);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER tg_zpn_customers_updated_at
  BEFORE UPDATE ON zpn_customers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpn_loans_updated_at
  BEFORE UPDATE ON zpn_loans FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE zpn_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_loans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpn_payments  ENABLE ROW LEVEL SECURITY;
CREATE POLICY zpn_customers_deny_all ON zpn_customers FOR ALL USING (false);
CREATE POLICY zpn_items_deny_all     ON zpn_items     FOR ALL USING (false);
CREATE POLICY zpn_loans_deny_all     ON zpn_loans     FOR ALL USING (false);
CREATE POLICY zpn_payments_deny_all  ON zpn_payments  FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZPN', 'zipawn_auctions',      'Auction Management',       '["plus","pro"]'),
  ('ZPN', 'zipawn_sms_reminder',  'Loan Due SMS Reminders',   '["solo","plus","pro"]'),
  ('ZPN', 'zipawn_overdue_scan',  'Daily Overdue Scanner',    '["solo","plus","pro"]'),
  ('ZPN', 'zipawn_bulk_export',   'Bulk Loan Export (CSV)',    '["plus","pro"]'),
  ('ZPN', 'zipawn_interest_calc', 'Compound Interest Loans',  '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

-- ============================================================
-- MIGRATION 006: ZIPULSE
-- ============================================================

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
  allergies                       TEXT[] NOT NULL DEFAULT '{}',
  address                         TEXT,
  city                            TEXT,
  state                           TEXT,
  country_code                    TEXT NOT NULL DEFAULT 'IN',
  emergency_contact_name          TEXT,
  emergency_contact_mobile_hash   TEXT,
  emergency_contact_mobile_last4  TEXT,
  status                          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  notes                           TEXT,
  created_by                      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpls_patients_entity ON zpls_patients(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpls_patients_mobile ON zpls_patients(mobile_hash);

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
CREATE INDEX IF NOT EXISTS idx_zpls_appointments_scheduled ON zpls_appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_zpls_appointments_status    ON zpls_appointments(status);

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
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','followed_up','converted','closed')),
  converted_to     UUID REFERENCES zpls_patients(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zpls_enquiries_entity ON zpls_enquiries(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpls_enquiries_status ON zpls_enquiries(status);

CREATE OR REPLACE TRIGGER tg_zpls_patients_updated_at
  BEFORE UPDATE ON zpls_patients     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpls_doctors_updated_at
  BEFORE UPDATE ON zpls_doctors      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpls_appointments_updated_at
  BEFORE UPDATE ON zpls_appointments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_zpls_enquiries_updated_at
  BEFORE UPDATE ON zpls_enquiries    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE zpls_patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpls_doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpls_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpls_enquiries    ENABLE ROW LEVEL SECURITY;
CREATE POLICY zpls_patients_deny_all     ON zpls_patients     FOR ALL USING (false);
CREATE POLICY zpls_doctors_deny_all      ON zpls_doctors      FOR ALL USING (false);
CREATE POLICY zpls_appointments_deny_all ON zpls_appointments FOR ALL USING (false);
CREATE POLICY zpls_enquiries_deny_all    ON zpls_enquiries    FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZPLS', 'zipulse_sms_reminder',    'Appointment SMS Reminders',   '["solo","plus","pro"]'),
  ('ZPLS', 'zipulse_prescription_pdf','Prescription PDF Export',      '["plus","pro"]'),
  ('ZPLS', 'zipulse_multi_doctor',    'Multiple Doctors',             '["plus","pro"]'),
  ('ZPLS', 'zipulse_inventory',       'Pharmacy Inventory',           '["pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

-- ============================================================
-- MIGRATION 007: ZINEED
-- ============================================================

CREATE TABLE IF NOT EXISTS znd_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code           TEXT NOT NULL UNIQUE,
  ref_code          TEXT NOT NULL UNIQUE,
  entity_id         UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id   UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  posted_by         UUID NOT NULL REFERENCES zi_individuals(id),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL,
  sub_category      TEXT,
  quantity          NUMERIC(14,3),
  unit              TEXT,
  budget_min_paise  BIGINT,
  budget_max_paise  BIGINT,
  location_city     TEXT,
  location_state    TEXT,
  delivery_date     DATE,
  is_urgent         BOOLEAN NOT NULL DEFAULT FALSE,
  is_anonymous      BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'published'
                      CHECK (status IN ('draft','published','matching','proposals_received','in_negotiation','deal_closed','completed','cancelled','expired')),
  proposal_count    INTEGER NOT NULL DEFAULT 0,
  expires_at        DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_entity   ON znd_requirements(entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_status   ON znd_requirements(status);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_category ON znd_requirements(category);
CREATE INDEX IF NOT EXISTS idx_znd_requirements_expires  ON znd_requirements(expires_at);

CREATE TABLE IF NOT EXISTS znd_proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id  UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  requirement_id   UUID NOT NULL REFERENCES znd_requirements(id) ON DELETE RESTRICT,
  proposed_by      UUID NOT NULL REFERENCES zi_individuals(id),
  price_paise      BIGINT NOT NULL,
  delivery_days    INTEGER NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','shortlisted','rejected','accepted','withdrawn')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_znd_proposals_requirement ON znd_proposals(requirement_id);
CREATE INDEX IF NOT EXISTS idx_znd_proposals_entity      ON znd_proposals(entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_proposals_status      ON znd_proposals(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_znd_proposals_unique_entity_req
  ON znd_proposals(entity_id, requirement_id) WHERE status NOT IN ('withdrawn','rejected');

CREATE TABLE IF NOT EXISTS znd_deals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code                TEXT NOT NULL UNIQUE,
  ref_code               TEXT NOT NULL UNIQUE,
  buyer_entity_id        UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  seller_entity_id       UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  requirement_id         UUID NOT NULL REFERENCES znd_requirements(id) ON DELETE RESTRICT,
  proposal_id            UUID NOT NULL REFERENCES znd_proposals(id) ON DELETE RESTRICT,
  agreed_price_paise     BIGINT NOT NULL,
  agreed_delivery_date   DATE NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','in_progress','completed','disputed','cancelled')),
  completed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_znd_deals_buyer  ON znd_deals(buyer_entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_deals_seller ON znd_deals(seller_entity_id);
CREATE INDEX IF NOT EXISTS idx_znd_deals_status ON znd_deals(status);

CREATE TABLE IF NOT EXISTS znd_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code          TEXT NOT NULL UNIQUE,
  ref_code         TEXT NOT NULL UNIQUE,
  deal_id          UUID NOT NULL REFERENCES znd_deals(id) ON DELETE RESTRICT,
  rated_by         UUID NOT NULL REFERENCES zi_individuals(id),
  rated_entity_id  UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  score            INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  review           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_znd_ratings_unique ON znd_ratings(deal_id, rated_by);
CREATE INDEX IF NOT EXISTS idx_znd_ratings_entity ON znd_ratings(rated_entity_id);

CREATE OR REPLACE FUNCTION fn_update_requirement_proposal_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE znd_requirements
  SET proposal_count = (
    SELECT COUNT(*) FROM znd_proposals
    WHERE requirement_id = COALESCE(NEW.requirement_id, OLD.requirement_id)
      AND status NOT IN ('withdrawn','rejected')
  )
  WHERE id = COALESCE(NEW.requirement_id, OLD.requirement_id);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER tg_znd_proposal_count
  AFTER INSERT OR UPDATE OR DELETE ON znd_proposals
  FOR EACH ROW EXECUTE FUNCTION fn_update_requirement_proposal_count();

CREATE OR REPLACE TRIGGER tg_znd_requirements_updated_at
  BEFORE UPDATE ON znd_requirements FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_znd_proposals_updated_at
  BEFORE UPDATE ON znd_proposals    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER tg_znd_deals_updated_at
  BEFORE UPDATE ON znd_deals        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE znd_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE znd_proposals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE znd_deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE znd_ratings      ENABLE ROW LEVEL SECURITY;
CREATE POLICY znd_requirements_deny_all ON znd_requirements FOR ALL USING (false);
CREATE POLICY znd_proposals_deny_all    ON znd_proposals    FOR ALL USING (false);
CREATE POLICY znd_deals_deny_all        ON znd_deals        FOR ALL USING (false);
CREATE POLICY znd_ratings_deny_all      ON znd_ratings      FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZND', 'zineed_proposals_unlimited', 'Unlimited Proposals',     '["pro"]'),
  ('ZND', 'zineed_ai_match',            'AI Supplier Matching',    '["pro"]'),
  ('ZND', 'zineed_analytics',           'Marketplace Analytics',   '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

-- ============================================================
-- SMOKE TEST — verify code generator works
-- Run this after the above to confirm everything is correct
-- ============================================================
SELECT fn_next_code('ZU')   AS individual_1;   -- expect ZUA01
SELECT fn_next_code('ZU')   AS individual_2;   -- expect ZUA02
SELECT fn_next_code('ZE')   AS entity_1;       -- expect ZEA01
SELECT fn_next_code('ZBR')  AS branch_1;       -- expect ZBRA01
SELECT fn_next_code('ZPN')  AS zipawn_sub_1;   -- expect ZPNA01
SELECT fn_next_code('ZPLS') AS zipulse_sub_1;  -- expect ZPLSA01
SELECT fn_next_code('ZND')  AS zineed_sub_1;   -- expect ZNDA01
SELECT fn_next_year_code('LN',  26) AS loan_1;     -- expect LN26A01
SELECT fn_next_year_code('TKT', 26) AS ticket_1;   -- expect TKT26A01
SELECT fn_next_year_code('PAY', 26) AS payment_1;  -- expect PAY26A01
SELECT fn_increment_alpha('A')  AS should_be_B;    -- expect B
SELECT fn_increment_alpha('Z')  AS should_be_AA;   -- expect AA
SELECT fn_increment_alpha('AZ') AS should_be_BA;   -- expect BA
SELECT fn_increment_alpha('ZZ') AS should_be_AAA;  -- expect AAA

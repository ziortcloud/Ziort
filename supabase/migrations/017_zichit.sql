-- ============================================================
-- Ziort — Migration 017: ZiChit (Chit Fund, Loans & Pigmy Savings)
-- Product code: ZCHT  |  Table prefix: zct_
-- Tagline: Community savings. Transparent cycles. Digital clarity.
-- Run after: 016_zishop.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Chit settings (entity-scoped)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  organizer_name       TEXT,
  gstin                TEXT,
  foreman_charge_pct   NUMERIC(5,2) NOT NULL DEFAULT 5,  -- default foreman commission %
  penalty_rate_pct     NUMERIC(5,2) NOT NULL DEFAULT 2,   -- monthly late-pay penalty
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Chit groups
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_chits (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- CHTA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  name                 TEXT NOT NULL,
  chit_value_paise     BIGINT NOT NULL CHECK (chit_value_paise > 0),  -- total pot
  num_members          INT NOT NULL CHECK (num_members >= 2),
  duration_months      INT NOT NULL,                     -- = num_members typically
  monthly_contribution_paise BIGINT NOT NULL,            -- chit_value / num_members
  foreman_charge_pct   NUMERIC(5,2) NOT NULL DEFAULT 5,
  auction_type         TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK (auction_type IN ('OPEN','SEALED')),

  start_date           DATE NOT NULL,
  end_date             DATE,                             -- computed on start
  current_cycle        INT NOT NULL DEFAULT 0,           -- 0 = not started
  status               TEXT NOT NULL DEFAULT 'FORMING'
                         CHECK (status IN ('FORMING','ACTIVE','COMPLETED','DISSOLVED')),

  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zct_chits_entity  ON zct_chits(entity_id);
CREATE INDEX IF NOT EXISTS idx_zct_chits_status  ON zct_chits(status);

-- ─────────────────────────────────────────────────────────────
-- Chit members
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_members (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id              UUID NOT NULL REFERENCES zct_chits(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  name                 TEXT NOT NULL,
  mobile_hash          TEXT,
  mobile_last4         TEXT,
  address              TEXT,
  id_proof_type        TEXT,
  id_proof_number      TEXT,
  ticket_number        INT NOT NULL,                     -- 1-based seat number
  has_received_pot     BOOLEAN NOT NULL DEFAULT false,
  received_at_cycle    INT,                              -- which cycle they won
  contact_id           UUID,                             -- optional ZiPulse link

  joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active            BOOLEAN NOT NULL DEFAULT true,

  UNIQUE (chit_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_zct_members_chit ON zct_members(chit_id);

-- ─────────────────────────────────────────────────────────────
-- Monthly contribution payments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_contributions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id              UUID NOT NULL REFERENCES zct_chits(id) ON DELETE CASCADE,
  member_id            UUID NOT NULL REFERENCES zct_members(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  cycle_number         INT NOT NULL,                     -- 1-indexed month
  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_mode         TEXT NOT NULL DEFAULT 'CASH'
                         CHECK (payment_mode IN (
                           'CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'
                         )),
  reference_number     TEXT,
  paid_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  penalty_paise        BIGINT NOT NULL DEFAULT 0,        -- late-pay penalty
  notes                TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chit_id, member_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_zct_contributions_chit    ON zct_contributions(chit_id);
CREATE INDEX IF NOT EXISTS idx_zct_contributions_member  ON zct_contributions(member_id);

-- ─────────────────────────────────────────────────────────────
-- Auction results (who won the pot in each cycle)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_auctions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id              UUID NOT NULL REFERENCES zct_chits(id) ON DELETE CASCADE,
  member_id            UUID NOT NULL REFERENCES zct_members(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  cycle_number         INT NOT NULL,
  bid_amount_paise     BIGINT NOT NULL,                  -- winning bid (discount amount)
  prize_amount_paise   BIGINT NOT NULL,                  -- pot - bid - foreman charge
  foreman_charge_paise BIGINT NOT NULL,
  disbursed_at         DATE,
  disbursement_mode    TEXT,
  reference_number     TEXT,
  notes                TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chit_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_zct_auctions_chit ON zct_auctions(chit_id);

-- ─────────────────────────────────────────────────────────────
-- Pigmy savings (daily collection scheme)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_pigmy_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- PGMA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,

  holder_name          TEXT NOT NULL,
  mobile_hash          TEXT,
  mobile_last4         TEXT,
  address              TEXT,
  id_proof_type        TEXT,

  daily_amount_paise   BIGINT NOT NULL CHECK (daily_amount_paise > 0),
  target_amount_paise  BIGINT,                           -- optional savings goal
  balance_paise        BIGINT NOT NULL DEFAULT 0,
  total_deposits       INT NOT NULL DEFAULT 0,

  status               TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','CLOSED','SUSPENDED')),

  opened_at            DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at            DATE,
  contact_id           UUID,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zct_pigmy_entity  ON zct_pigmy_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_zct_pigmy_status  ON zct_pigmy_accounts(status);

-- ─────────────────────────────────────────────────────────────
-- Pigmy deposit ledger
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zct_pigmy_deposits (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES zct_pigmy_accounts(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  deposit_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_mode         TEXT NOT NULL DEFAULT 'CASH'
                         CHECK (payment_mode IN (
                           'CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'
                         )),
  reference_number     TEXT,
  balance_after_paise  BIGINT NOT NULL,
  collected_by         UUID REFERENCES zi_individuals(id),
  notes                TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zct_pigmy_deposits_account ON zct_pigmy_deposits(account_id);

-- ─────────────────────────────────────────────────────────────
-- Trigger: update pigmy balance + deposit count on deposit insert
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_zct_on_pigmy_deposit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE zct_pigmy_accounts
     SET balance_paise    = balance_paise + NEW.amount_paise,
         total_deposits   = total_deposits + 1,
         updated_at       = now()
   WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zct_pigmy_deposit
  AFTER INSERT ON zct_pigmy_deposits
  FOR EACH ROW EXECUTE FUNCTION fn_zct_on_pigmy_deposit();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zct_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zct_chits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zct_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zct_contributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zct_auctions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zct_pigmy_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zct_pigmy_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY zct_settings_deny       ON zct_settings       FOR ALL USING (false);
CREATE POLICY zct_chits_deny          ON zct_chits          FOR ALL USING (false);
CREATE POLICY zct_members_deny        ON zct_members        FOR ALL USING (false);
CREATE POLICY zct_contributions_deny  ON zct_contributions  FOR ALL USING (false);
CREATE POLICY zct_auctions_deny       ON zct_auctions       FOR ALL USING (false);
CREATE POLICY zct_pigmy_accounts_deny ON zct_pigmy_accounts FOR ALL USING (false);
CREATE POLICY zct_pigmy_deposits_deny ON zct_pigmy_deposits FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZCHT', 'zichit_chit_fund',    'Chit Fund Management',      '["solo","plus","pro"]'),
  ('ZCHT', 'zichit_pigmy',        'Pigmy Daily Savings',       '["solo","plus","pro"]'),
  ('ZCHT', 'zichit_auction',      'Auction Cycle Recording',   '["solo","plus","pro"]'),
  ('ZCHT', 'zichit_penalty',      'Late Payment Penalties',    '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

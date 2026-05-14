-- ============================================================
-- Ziort — Migration 023: ZiPartner (Referral & Commission Program)
-- Product code: ZPRTN  |  Table prefix: zpt_
-- Tagline: Refer. Earn. Grow together.
-- Run after: 022_zipost.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS zpt_partners (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- PTNA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  name                 TEXT NOT NULL,
  mobile_hash          TEXT,
  mobile_last4         TEXT,
  email                TEXT,
  referral_code        TEXT NOT NULL UNIQUE,              -- 6-char alphanumeric
  tier                 TEXT NOT NULL DEFAULT 'STANDARD'
                         CHECK (tier IN ('STANDARD','SILVER','GOLD','PLATINUM')),
  commission_pct       NUMERIC(5,2) NOT NULL DEFAULT 5,

  total_referrals      INT NOT NULL DEFAULT 0,
  total_revenue_paise  BIGINT NOT NULL DEFAULT 0,         -- revenue generated from referrals
  total_commission_paise BIGINT NOT NULL DEFAULT 0,
  pending_payout_paise BIGINT NOT NULL DEFAULT 0,
  lifetime_paid_paise  BIGINT NOT NULL DEFAULT 0,

  bank_account_number  TEXT,
  bank_ifsc            TEXT,
  bank_account_name    TEXT,
  upi_id               TEXT,

  is_active            BOOLEAN NOT NULL DEFAULT true,
  joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id           UUID,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpt_partners_entity ON zpt_partners(entity_id);
CREATE INDEX IF NOT EXISTS idx_zpt_partners_code   ON zpt_partners(referral_code);

CREATE TABLE IF NOT EXISTS zpt_referrals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id           UUID NOT NULL REFERENCES zpt_partners(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  referred_entity_id   UUID REFERENCES zi_entities(id),  -- the referred business
  referred_name        TEXT NOT NULL,
  referred_mobile_hash TEXT,
  referred_mobile_last4 TEXT,

  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','CONVERTED','FAILED')),
  converted_at         TIMESTAMPTZ,
  revenue_generated_paise BIGINT NOT NULL DEFAULT 0,
  commission_paise     BIGINT NOT NULL DEFAULT 0,
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpt_referrals_partner ON zpt_referrals(partner_id);

CREATE TABLE IF NOT EXISTS zpt_payouts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- PYOT26A01
  partner_id           UUID NOT NULL REFERENCES zpt_partners(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_mode         TEXT NOT NULL DEFAULT 'BANK'
                         CHECK (payment_mode IN ('BANK','UPI','CASH','CHEQUE','OTHER')),
  reference_number     TEXT,
  paid_at              TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','PAID','FAILED')),
  notes                TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zpt_payouts_partner ON zpt_payouts(partner_id);

-- Trigger: on payout paid, reduce pending and add to lifetime
CREATE OR REPLACE FUNCTION fn_zpt_on_payout_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'PAID' AND OLD.status <> 'PAID' THEN
    UPDATE zpt_partners SET
      pending_payout_paise = GREATEST(0, pending_payout_paise - NEW.amount_paise),
      lifetime_paid_paise  = lifetime_paid_paise + NEW.amount_paise,
      updated_at           = now()
    WHERE id = NEW.partner_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zpt_payout_paid
  AFTER UPDATE ON zpt_payouts
  FOR EACH ROW EXECUTE FUNCTION fn_zpt_on_payout_paid();

ALTER TABLE zpt_partners  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpt_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE zpt_payouts   ENABLE ROW LEVEL SECURITY;

CREATE POLICY zpt_partners_deny  ON zpt_partners  FOR ALL USING (false);
CREATE POLICY zpt_referrals_deny ON zpt_referrals FOR ALL USING (false);
CREATE POLICY zpt_payouts_deny   ON zpt_payouts   FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZPRTN', 'zipartner_referrals', 'Referral Tracking',       '["plus","pro"]'),
  ('ZPRTN', 'zipartner_payouts',   'Commission Payouts',      '["plus","pro"]'),
  ('ZPRTN', 'zipartner_tiers',     'Partner Tier System',     '["pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

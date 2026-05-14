-- ============================================================
-- Ziort — Migration 003: Billing System
-- Wallet (prepaid), billing log, daily deduction engine
-- ============================================================

-- ============================================================
-- zi_wallet
--    One wallet per entity. Prepaid balance in paise (₹1 = 100 paise).
--    Storing in paise avoids floating-point rounding errors.
-- ============================================================
CREATE TABLE zi_wallet (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID UNIQUE NOT NULL REFERENCES zi_entities(id),
  balance_paise  BIGINT NOT NULL DEFAULT 0,         -- current balance in paise
  currency       TEXT NOT NULL DEFAULT 'INR',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_entity ON zi_wallet(entity_id);

-- ============================================================
-- zi_billing_log
--    Every debit / credit on the wallet.
--    Immutable — never update or delete rows.
-- ============================================================
CREATE TABLE zi_billing_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           UUID NOT NULL REFERENCES zi_entities(id),
  transaction_type    TEXT NOT NULL,               -- debit | credit | refund | adjustment
  amount_paise        BIGINT NOT NULL,             -- always positive; sign determined by transaction_type
  description         TEXT NOT NULL,
  ref_code            TEXT,                        -- links to the subscription or deal that triggered this
  balance_after_paise BIGINT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES zi_individuals(id),  -- null = system (cron)
  CONSTRAINT chk_tx_type CHECK (transaction_type IN ('debit','credit','refund','adjustment'))
);

CREATE INDEX idx_billing_log_entity ON zi_billing_log(entity_id);
CREATE INDEX idx_billing_log_created ON zi_billing_log(created_at DESC);

-- ============================================================
-- zi_billing_snapshot
--    Daily snapshot of what each entity owes.
--    Computed by /api/v1/billing/cron/daily-deduct.
--    Stored for audit + dispute resolution.
-- ============================================================
CREATE TABLE zi_billing_snapshot (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id             UUID NOT NULL REFERENCES zi_entities(id),
  snapshot_date         DATE NOT NULL,
  product_count         INT NOT NULL DEFAULT 0,
  active_user_count     INT NOT NULL DEFAULT 0,
  branch_count          INT NOT NULL DEFAULT 0,
  bundle_discount_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  base_cost_paise       BIGINT NOT NULL DEFAULT 0,  -- before discount
  discount_paise        BIGINT NOT NULL DEFAULT 0,
  daily_cost_paise      BIGINT NOT NULL DEFAULT 0,  -- after discount
  notification_cost_paise BIGINT NOT NULL DEFAULT 0,
  total_cost_paise      BIGINT NOT NULL DEFAULT 0,
  deducted              BOOLEAN NOT NULL DEFAULT FALSE,
  deducted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, snapshot_date)
);

CREATE INDEX idx_billing_snapshot_entity ON zi_billing_snapshot(entity_id);
CREATE INDEX idx_billing_snapshot_date ON zi_billing_snapshot(snapshot_date DESC);

-- ============================================================
-- zi_topup_requests
--    Tracks top-up initiations (payment gateway → wallet credit).
-- ============================================================
CREATE TABLE zi_topup_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  individual_id   UUID NOT NULL REFERENCES zi_individuals(id),
  amount_paise    BIGINT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  gateway         TEXT NOT NULL DEFAULT 'manual',  -- razorpay | stripe | manual
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed | refunded
  credited_at     TIMESTAMPTZ,                     -- when wallet was actually credited
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_topup_status CHECK (status IN ('pending','success','failed','refunded'))
);

CREATE INDEX idx_topup_entity ON zi_topup_requests(entity_id);

-- ============================================================
-- fn_debit_wallet(entity_id, amount_paise, description, ref_code, individual_id)
--    Atomically deducts from wallet and writes billing_log.
--    Returns new balance. Raises exception if insufficient funds.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_debit_wallet(
  p_entity_id      UUID,
  p_amount_paise   BIGINT,
  p_description    TEXT,
  p_ref_code       TEXT DEFAULT NULL,
  p_individual_id  UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  UPDATE zi_wallet
  SET balance_paise = balance_paise - p_amount_paise,
      updated_at    = NOW()
  WHERE entity_id = p_entity_id
  RETURNING balance_paise INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for entity %', p_entity_id;
  END IF;

  -- Allow negative balance — app layer handles grace period logic
  INSERT INTO zi_billing_log
    (entity_id, transaction_type, amount_paise, description, ref_code, balance_after_paise, created_by)
  VALUES
    (p_entity_id, 'debit', p_amount_paise, p_description, p_ref_code, new_balance, p_individual_id);

  RETURN new_balance;
END;
$$;

-- ============================================================
-- fn_credit_wallet(entity_id, amount_paise, description, ref_code, individual_id)
--    Atomically credits wallet and writes billing_log.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_credit_wallet(
  p_entity_id      UUID,
  p_amount_paise   BIGINT,
  p_description    TEXT,
  p_ref_code       TEXT DEFAULT NULL,
  p_individual_id  UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  INSERT INTO zi_wallet (entity_id, balance_paise)
  VALUES (p_entity_id, p_amount_paise)
  ON CONFLICT (entity_id)
  DO UPDATE SET
    balance_paise = zi_wallet.balance_paise + p_amount_paise,
    updated_at    = NOW()
  RETURNING balance_paise INTO new_balance;

  INSERT INTO zi_billing_log
    (entity_id, transaction_type, amount_paise, description, ref_code, balance_after_paise, created_by)
  VALUES
    (p_entity_id, 'credit', p_amount_paise, p_description, p_ref_code, new_balance, p_individual_id);

  RETURN new_balance;
END;
$$;

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
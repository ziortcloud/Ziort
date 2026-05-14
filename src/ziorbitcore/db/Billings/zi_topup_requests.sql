

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

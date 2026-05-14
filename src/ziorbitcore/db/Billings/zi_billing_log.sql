
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

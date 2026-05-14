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

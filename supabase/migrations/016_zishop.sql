-- ============================================================
-- Ziort — Migration 016: ZiShop (Smart POS Billing + Live Inventory)
-- Product code: ZSHP  |  Table prefix: zsh_
-- Tagline: Ring it. Track it. Grow it.
-- Run after: 015_zireceipt.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Shop settings (entity-scoped, one row per subscription)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  shop_name            TEXT,
  gstin                TEXT,
  tax_regime           TEXT NOT NULL DEFAULT 'GST'
                         CHECK (tax_regime IN ('GST','COMPOSITION','NONE')),
  supply_type          TEXT NOT NULL DEFAULT 'INTRASTATE'
                         CHECK (supply_type IN ('INTRASTATE','INTERSTATE')),
  default_gst_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 18,
  currency             TEXT NOT NULL DEFAULT 'INR',

  receipt_header       TEXT,
  receipt_footer       TEXT,
  receipt_show_gstin   BOOLEAN NOT NULL DEFAULT true,
  receipt_show_tax     BOOLEAN NOT NULL DEFAULT true,
  upi_id               TEXT,
  upi_qr_url           TEXT,

  loyalty_enabled      BOOLEAN NOT NULL DEFAULT false,
  loyalty_points_per_rupee NUMERIC(8,4) NOT NULL DEFAULT 1,
  loyalty_rupee_per_point  NUMERIC(8,4) NOT NULL DEFAULT 0.1,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Product categories (hierarchical)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_categories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- ZSHCA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  name                 TEXT NOT NULL,
  description          TEXT,
  parent_id            UUID REFERENCES zsh_categories(id),
  sort_order           INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  image_url            TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Products / SKUs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- ZSHPA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  category_id          UUID REFERENCES zsh_categories(id),

  name                 TEXT NOT NULL,
  description          TEXT,
  sku                  TEXT,
  barcode              TEXT,
  hsn_sac_code         TEXT,
  unit                 TEXT NOT NULL DEFAULT 'PCS'
                         CHECK (unit IN ('PCS','KG','G','LTR','ML','MTR','CM','BOX','PKT','DZ','NOS','OTH')),

  -- Pricing
  cost_price_paise     BIGINT NOT NULL DEFAULT 0 CHECK (cost_price_paise >= 0),
  selling_price_paise  BIGINT NOT NULL CHECK (selling_price_paise >= 0),
  mrp_paise            BIGINT CHECK (mrp_paise >= 0),

  -- Tax
  gst_rate_pct         NUMERIC(5,2) NOT NULL DEFAULT 18
                         CHECK (gst_rate_pct IN (0,0.25,1,1.5,3,5,7.5,12,18,28)),
  cess_rate_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_inclusive_tax     BOOLEAN NOT NULL DEFAULT false,   -- price includes GST

  -- Inventory
  track_stock          BOOLEAN NOT NULL DEFAULT true,
  is_active            BOOLEAN NOT NULL DEFAULT true,

  image_url            TEXT,
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_products_entity   ON zsh_products(entity_id);
CREATE INDEX IF NOT EXISTS idx_zsh_products_category ON zsh_products(category_id);
CREATE INDEX IF NOT EXISTS idx_zsh_products_barcode  ON zsh_products(barcode);
CREATE INDEX IF NOT EXISTS idx_zsh_products_sku      ON zsh_products(sku);

-- ─────────────────────────────────────────────────────────────
-- Stock levels (one row per product)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_stock (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL UNIQUE REFERENCES zsh_products(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  qty_on_hand          NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_level        NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_qty          NUMERIC(14,3) NOT NULL DEFAULT 0,

  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_stock_entity ON zsh_stock(entity_id);

-- ─────────────────────────────────────────────────────────────
-- Stock movements (audit trail)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_stock_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES zsh_products(id) ON DELETE CASCADE,

  movement_type        TEXT NOT NULL
                         CHECK (movement_type IN (
                           'PURCHASE_IN','SALE_OUT','RETURN_IN','RETURN_OUT',
                           'ADJUSTMENT','WASTAGE','OPENING'
                         )),
  qty_change           NUMERIC(14,3) NOT NULL,           -- positive = in, negative = out
  qty_before           NUMERIC(14,3) NOT NULL,
  qty_after            NUMERIC(14,3) NOT NULL,
  reference_id         UUID,                             -- bill_id, purchase_id, etc.
  reference_type       TEXT,                             -- 'BILL', 'PURCHASE', 'MANUAL'
  note                 TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_movements_product ON zsh_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_zsh_movements_entity  ON zsh_stock_movements(entity_id);

-- ─────────────────────────────────────────────────────────────
-- Customers (walk-in or registered)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_customers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  name                 TEXT NOT NULL,
  mobile_hash          TEXT,                             -- SHA-256 of mobile
  mobile_last4         TEXT,
  email                TEXT,
  gstin                TEXT,
  address              TEXT,
  loyalty_points       BIGINT NOT NULL DEFAULT 0,
  total_spent_paise    BIGINT NOT NULL DEFAULT 0,
  total_bills          INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,

  contact_id           UUID,                             -- optional ZiPulse link
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_customers_entity      ON zsh_customers(entity_id);
CREATE INDEX IF NOT EXISTS idx_zsh_customers_mobile_hash ON zsh_customers(mobile_hash);

-- ─────────────────────────────────────────────────────────────
-- Bills (POS bill header)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_bills (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- BILL26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  branch_id            UUID REFERENCES zi_branches(id),
  customer_id          UUID REFERENCES zsh_customers(id),

  -- Customer snapshot (walk-in or at-time-of-billing)
  customer_name        TEXT,
  customer_mobile      TEXT,
  customer_gstin       TEXT,

  bill_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  supply_type          TEXT NOT NULL DEFAULT 'INTRASTATE'
                         CHECK (supply_type IN ('INTRASTATE','INTERSTATE')),

  -- Totals (computed by API)
  gross_amount_paise   BIGINT NOT NULL DEFAULT 0,
  discount_paise       BIGINT NOT NULL DEFAULT 0,
  taxable_amount_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise           BIGINT NOT NULL DEFAULT 0,
  sgst_paise           BIGINT NOT NULL DEFAULT 0,
  igst_paise           BIGINT NOT NULL DEFAULT 0,
  cess_paise           BIGINT NOT NULL DEFAULT 0,
  grand_total_paise    BIGINT NOT NULL DEFAULT 0,
  amount_paid_paise    BIGINT NOT NULL DEFAULT 0,
  amount_due_paise     BIGINT NOT NULL DEFAULT 0,
  amount_words         TEXT,

  -- Loyalty
  loyalty_points_used  BIGINT NOT NULL DEFAULT 0,
  loyalty_points_earned BIGINT NOT NULL DEFAULT 0,
  loyalty_discount_paise BIGINT NOT NULL DEFAULT 0,

  -- Lifecycle
  status               TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT','PAID','CANCELLED')),
  notes                TEXT,
  cancelled_at         TIMESTAMPTZ,
  cancel_reason        TEXT,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_bills_entity  ON zsh_bills(entity_id);
CREATE INDEX IF NOT EXISTS idx_zsh_bills_date    ON zsh_bills(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_zsh_bills_status  ON zsh_bills(status);
CREATE INDEX IF NOT EXISTS idx_zsh_bills_customer ON zsh_bills(customer_id);

-- ─────────────────────────────────────────────────────────────
-- Bill items (line items on a bill)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_bill_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id              UUID NOT NULL REFERENCES zsh_bills(id) ON DELETE CASCADE,
  product_id           UUID REFERENCES zsh_products(id),

  -- Product snapshot (at time of billing)
  product_name         TEXT NOT NULL,
  hsn_sac_code         TEXT,
  unit                 TEXT NOT NULL DEFAULT 'PCS',
  barcode              TEXT,

  qty                  NUMERIC(14,3) NOT NULL CHECK (qty > 0),
  rate_paise           BIGINT NOT NULL CHECK (rate_paise >= 0),
  discount_pct         NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_rate_pct         NUMERIC(5,2) NOT NULL DEFAULT 0,
  cess_rate_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Computed breakdown
  gross_amount_paise   BIGINT NOT NULL DEFAULT 0,
  discount_paise       BIGINT NOT NULL DEFAULT 0,
  taxable_amount_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise           BIGINT NOT NULL DEFAULT 0,
  sgst_paise           BIGINT NOT NULL DEFAULT 0,
  igst_paise           BIGINT NOT NULL DEFAULT 0,
  cess_paise           BIGINT NOT NULL DEFAULT 0,
  total_paise          BIGINT NOT NULL DEFAULT 0,

  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_bill_items_bill    ON zsh_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_zsh_bill_items_product ON zsh_bill_items(product_id);

-- ─────────────────────────────────────────────────────────────
-- Bill payments (split payment support)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zsh_bill_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id              UUID NOT NULL REFERENCES zsh_bills(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  payment_mode         TEXT NOT NULL DEFAULT 'CASH'
                         CHECK (payment_mode IN (
                           'CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'
                         )),
  amount_paise         BIGINT NOT NULL CHECK (amount_paise > 0),
  reference_number     TEXT,
  paid_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsh_payments_bill   ON zsh_bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_zsh_payments_entity ON zsh_bill_payments(entity_id);

-- ─────────────────────────────────────────────────────────────
-- RLS — deny all; service-role bypasses
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zsh_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_bills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_bill_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsh_bill_payments   ENABLE ROW LEVEL SECURITY;

CREATE POLICY zsh_settings_deny        ON zsh_settings        FOR ALL USING (false);
CREATE POLICY zsh_categories_deny      ON zsh_categories      FOR ALL USING (false);
CREATE POLICY zsh_products_deny        ON zsh_products        FOR ALL USING (false);
CREATE POLICY zsh_stock_deny           ON zsh_stock           FOR ALL USING (false);
CREATE POLICY zsh_stock_movements_deny ON zsh_stock_movements FOR ALL USING (false);
CREATE POLICY zsh_customers_deny       ON zsh_customers       FOR ALL USING (false);
CREATE POLICY zsh_bills_deny           ON zsh_bills           FOR ALL USING (false);
CREATE POLICY zsh_bill_items_deny      ON zsh_bill_items      FOR ALL USING (false);
CREATE POLICY zsh_bill_payments_deny   ON zsh_bill_payments   FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZSHP', 'zishop_pos_billing',    'POS Billing',              '["solo","plus","pro"]'),
  ('ZSHP', 'zishop_inventory',      'Live Inventory Tracking',  '["solo","plus","pro"]'),
  ('ZSHP', 'zishop_loyalty',        'Customer Loyalty Points',  '["plus","pro"]'),
  ('ZSHP', 'zishop_split_payment',  'Split Payment Modes',      '["plus","pro"]'),
  ('ZSHP', 'zishop_gst_billing',    'GST Tax Bill',             '["solo","plus","pro"]'),
  ('ZSHP', 'zishop_barcode',        'Barcode Lookup',           '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

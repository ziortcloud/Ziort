-- ============================================================
-- Ziort — Migration 018: ZiFood (Restaurant & Café Management)
-- Product code: ZFOD  |  Table prefix: zfd_
-- Tagline: Table to kitchen. Kitchen to revenue. All digital.
-- Run after: 017_zichit.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Restaurant settings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL UNIQUE REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  restaurant_name      TEXT,
  fssai_number         TEXT,
  gstin                TEXT,
  supply_type          TEXT NOT NULL DEFAULT 'INTRASTATE'
                         CHECK (supply_type IN ('INTRASTATE','INTERSTATE')),
  default_gst_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 5,  -- restaurant GST is typically 5%
  service_charge_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'INR',
  bill_header          TEXT,
  bill_footer          TEXT,
  upi_id               TEXT,
  table_booking_enabled BOOLEAN NOT NULL DEFAULT true,
  kot_printer_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Dining sections (Floor, Terrace, Bar, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_sections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  sort_order           INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_tables (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL,                    -- T01, T02, etc.
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  section_id           UUID REFERENCES zfd_sections(id),
  name                 TEXT NOT NULL,                    -- "Table 4", "Counter 1"
  capacity             INT NOT NULL DEFAULT 4,
  status               TEXT NOT NULL DEFAULT 'AVAILABLE'
                         CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','CLEANING')),
  qr_code_url          TEXT,                             -- for table-side ordering
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zfd_tables_entity  ON zfd_tables(entity_id);
CREATE INDEX IF NOT EXISTS idx_zfd_tables_status  ON zfd_tables(status);
CREATE INDEX IF NOT EXISTS idx_zfd_tables_section ON zfd_tables(section_id);

-- ─────────────────────────────────────────────────────────────
-- Menu categories
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_menu_categories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  sort_order           INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  image_url            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Menu items
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_menu_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- FMIA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,
  category_id          UUID REFERENCES zfd_menu_categories(id),

  name                 TEXT NOT NULL,
  description          TEXT,
  is_veg               BOOLEAN NOT NULL DEFAULT true,
  hsn_sac_code         TEXT,
  base_price_paise     BIGINT NOT NULL CHECK (base_price_paise >= 0),
  gst_rate_pct         NUMERIC(5,2) NOT NULL DEFAULT 5,
  is_available         BOOLEAN NOT NULL DEFAULT true,
  prep_time_minutes    INT,
  image_url            TEXT,
  tags                 TEXT[],                            -- ['bestseller','spicy','new']

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zfd_menu_items_entity   ON zfd_menu_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_zfd_menu_items_category ON zfd_menu_items(category_id);

-- ─────────────────────────────────────────────────────────────
-- Orders (dining session)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- ORD26A01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE RESTRICT,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE RESTRICT,
  table_id             UUID REFERENCES zfd_tables(id),

  order_type           TEXT NOT NULL DEFAULT 'DINE_IN'
                         CHECK (order_type IN ('DINE_IN','TAKEAWAY','DELIVERY','SWIGGY','ZOMATO')),
  customer_name        TEXT,
  customer_mobile      TEXT,
  num_guests           INT DEFAULT 1,

  -- Totals
  gross_amount_paise   BIGINT NOT NULL DEFAULT 0,
  discount_paise       BIGINT NOT NULL DEFAULT 0,
  taxable_amount_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise           BIGINT NOT NULL DEFAULT 0,
  sgst_paise           BIGINT NOT NULL DEFAULT 0,
  igst_paise           BIGINT NOT NULL DEFAULT 0,
  service_charge_paise BIGINT NOT NULL DEFAULT 0,
  grand_total_paise    BIGINT NOT NULL DEFAULT 0,
  amount_paid_paise    BIGINT NOT NULL DEFAULT 0,
  amount_words         TEXT,

  status               TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('OPEN','BILLED','PAID','CANCELLED')),
  kot_printed          BOOLEAN NOT NULL DEFAULT false,
  notes                TEXT,

  opened_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  billed_at            TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zfd_orders_entity  ON zfd_orders(entity_id);
CREATE INDEX IF NOT EXISTS idx_zfd_orders_status  ON zfd_orders(status);
CREATE INDEX IF NOT EXISTS idx_zfd_orders_table   ON zfd_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_zfd_orders_date    ON zfd_orders(opened_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Order items / KOT lines
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES zfd_orders(id) ON DELETE CASCADE,
  menu_item_id         UUID REFERENCES zfd_menu_items(id),

  item_name            TEXT NOT NULL,
  is_veg               BOOLEAN NOT NULL DEFAULT true,
  qty                  NUMERIC(8,2) NOT NULL CHECK (qty > 0),
  rate_paise           BIGINT NOT NULL CHECK (rate_paise >= 0),
  discount_pct         NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_rate_pct         NUMERIC(5,2) NOT NULL DEFAULT 5,

  -- Computed
  gross_amount_paise   BIGINT NOT NULL DEFAULT 0,
  discount_paise       BIGINT NOT NULL DEFAULT 0,
  taxable_amount_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise           BIGINT NOT NULL DEFAULT 0,
  sgst_paise           BIGINT NOT NULL DEFAULT 0,
  igst_paise           BIGINT NOT NULL DEFAULT 0,
  total_paise          BIGINT NOT NULL DEFAULT 0,

  -- KOT tracking
  kot_status           TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (kot_status IN ('PENDING','SENT','PREPARING','READY','SERVED','CANCELLED')),
  kot_sent_at          TIMESTAMPTZ,
  special_instructions TEXT,
  sort_order           INT NOT NULL DEFAULT 0,
  added_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zfd_order_items_order ON zfd_order_items(order_id);

-- ─────────────────────────────────────────────────────────────
-- KOT (Kitchen Order Tickets)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_kots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- KOT26A01
  order_id             UUID NOT NULL REFERENCES zfd_orders(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  table_name           TEXT,
  item_count           INT NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'SENT'
                         CHECK (status IN ('SENT','PREPARING','READY','SERVED')),
  printed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Order payments (split payment)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zfd_order_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES zfd_orders(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_zfd_order_payments_order ON zfd_order_payments(order_id);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE zfd_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_tables          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_kots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE zfd_order_payments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY zfd_settings_deny        ON zfd_settings        FOR ALL USING (false);
CREATE POLICY zfd_sections_deny        ON zfd_sections        FOR ALL USING (false);
CREATE POLICY zfd_tables_deny          ON zfd_tables          FOR ALL USING (false);
CREATE POLICY zfd_menu_categories_deny ON zfd_menu_categories FOR ALL USING (false);
CREATE POLICY zfd_menu_items_deny      ON zfd_menu_items      FOR ALL USING (false);
CREATE POLICY zfd_orders_deny          ON zfd_orders          FOR ALL USING (false);
CREATE POLICY zfd_order_items_deny     ON zfd_order_items     FOR ALL USING (false);
CREATE POLICY zfd_kots_deny            ON zfd_kots            FOR ALL USING (false);
CREATE POLICY zfd_order_payments_deny  ON zfd_order_payments  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Feature flags
-- ─────────────────────────────────────────────────────────────
INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZFOD', 'zifood_table_mgmt',   'Table Management',         '["solo","plus","pro"]'),
  ('ZFOD', 'zifood_kot',          'Kitchen Order Tickets',    '["solo","plus","pro"]'),
  ('ZFOD', 'zifood_menu',         'Digital Menu',             '["solo","plus","pro"]'),
  ('ZFOD', 'zifood_delivery',     'Delivery Orders',          '["plus","pro"]'),
  ('ZFOD', 'zifood_service_charge','Service Charge',          '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

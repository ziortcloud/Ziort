-- ============================================================
-- zi_code_sequences
--    Tracks the last issued code for every prefix.
--    Row-level locking (FOR UPDATE) ensures no duplicates
--    even under concurrent inserts.
-- ============================================================
CREATE TABLE zi_code_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_prefix   TEXT UNIQUE NOT NULL,   -- ZU, ZE, ZBR, ZPN, LN, PAY...
  last_sequence TEXT NOT NULL,          -- last generated full code e.g. ZPNA01
  total_issued  BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed: All known code prefixes
-- Format: (prefix, initial_placeholder, 0)
-- Placeholder uses '00' so first real call generates 'A01'
-- ============================================================
INSERT INTO zi_code_sequences (code_prefix, last_sequence, total_issued) VALUES
  -- Identity + Structure Layer
  ('ZU',    'ZUA00',     0),   -- Individuals
  ('ZE',    'ZEA00',     0),   -- Entities
  ('ZBR',   'ZBRA00',    0),   -- Branches

  -- Product Subscription Prefixes
  ('ZPN',   'ZPNA00',    0),   -- ZiPawn
  ('ZFLT',  'ZFLTA00',   0),   -- ZiFleet
  ('ZLD',   'ZLDA00',    0),   -- ZiLoad
  ('ZFD',   'ZFDA00',    0),   -- ZiFood
  ('ZCR',   'ZCRA00',    0),   -- ZiCare
  ('ZSHP',  'ZSHPA00',   0),   -- ZiShop
  ('ZCHT',  'ZCHTA00',   0),   -- ZiChit
  ('ZBLD',  'ZBLDA00',   0),   -- ZiBuild
  ('ZYLD',  'ZYLDA00',   0),   -- ZiYield
  ('ZPST',  'ZPSTA00',   0),   -- ZiPost
  ('ZSCN',  'ZSCNA00',   0),   -- ZiScan
  ('ZCLC',  'ZCLCA00',   0),   -- ZiCalc
  ('ZRCP',  'ZRCPA00',   0),   -- ZiReceipt
  ('ZNVC',  'ZNVCA00',   0),   -- ZiInvoice
  ('ZQT',   'ZQTA00',    0),   -- ZiQuote
  ('ZLDG',  'ZLDGA00',   0),   -- ZiLedger
  ('ZPRTN', 'ZPRTNA00',  0),   -- ZiPartner
  ('ZPLS',  'ZPLSA00',   0),   -- ZiPulse  ← NEW (from PRD)
  ('ZND',   'ZNDA00',    0),   -- ZiNeed   ← NEW (from PRD)

  -- Business Contact Type Prefixes (entity+sub scoped)
  ('CST',   'CSTA00',    0),   -- Customer
  ('SUP',   'SUPA00',    0),   -- Supplier
  ('VND',   'VNDA00',    0),   -- Vendor
  ('AGT',   'AGTA00',    0),   -- Agent
  ('PTR',   'PTRA00',    0);   -- Partner (external)

-- Note: Transaction codes (LN, TKT, PAY, etc.) are year-scoped.
-- Their prefixes are inserted on first use as 'LN26', 'TKT26', etc.
-- by fn_next_year_code(). No need to seed them here.

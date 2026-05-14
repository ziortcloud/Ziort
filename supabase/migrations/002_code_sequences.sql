-- ============================================================
-- Ziort — Migration 002: Code Sequences + Alpha-Grow Generator
-- The single source of truth for ALL business codes.
-- ============================================================

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
-- fn_increment_alpha(alpha TEXT) → TEXT
--    Increments an uppercase alpha string:
--    A→B, Z→AA, AZ→BA, ZZ→AAA
-- ============================================================
CREATE OR REPLACE FUNCTION fn_increment_alpha(alpha TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  chars  TEXT[];
  i      INT;
  carry  BOOLEAN := TRUE;
  result TEXT := '';
BEGIN
  -- Split into character array
  FOR i IN 1..length(alpha) LOOP
    chars[i] := substring(alpha FROM i FOR 1);
  END LOOP;

  -- Increment from right, propagate carry
  FOR i IN REVERSE 1..array_length(chars, 1) LOOP
    IF carry THEN
      IF chars[i] = 'Z' THEN
        chars[i] := 'A';
        carry := TRUE;
      ELSE
        chars[i] := chr(ascii(chars[i]) + 1);
        carry := FALSE;
      END IF;
    END IF;
  END LOOP;

  -- If still carrying, prepend 'A' (Z→AA, ZZ→AAA)
  IF carry THEN
    result := 'A';
  END IF;

  FOR i IN 1..array_length(chars, 1) LOOP
    result := result || chars[i];
  END LOOP;

  RETURN result;
END;
$$;

-- ============================================================
-- fn_next_code(prefix TEXT) → TEXT
--    Generates the next business code for a given prefix.
--    Thread-safe: uses FOR UPDATE row lock.
--    Returns full code e.g. fn_next_code('ZPN') → 'ZPNA01'
-- ============================================================
CREATE OR REPLACE FUNCTION fn_next_code(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  last_seq   TEXT;
  alpha_part TEXT;
  num_part   INT;
  next_alpha TEXT;
  next_num   TEXT;
  new_code   TEXT;
BEGIN
  -- Lock the row for this prefix to prevent concurrent generation
  SELECT last_sequence INTO last_seq
  FROM zi_code_sequences
  WHERE code_prefix = prefix
  FOR UPDATE;

  -- First ever code for this prefix
  IF last_seq IS NULL THEN
    new_code := prefix || 'A01';
    INSERT INTO zi_code_sequences (code_prefix, last_sequence, total_issued)
    VALUES (prefix, new_code, 1);
    RETURN new_code;
  END IF;

  -- Extract alpha part (letters after prefix) and numeric part (last 2 digits)
  alpha_part := regexp_replace(last_seq, '^' || prefix || '([A-Z]+)([0-9]{2})$', '\1');
  num_part   := (regexp_replace(last_seq, '^' || prefix || '([A-Z]+)([0-9]{2})$', '\2'))::INT;

  IF num_part < 99 THEN
    next_num   := lpad((num_part + 1)::TEXT, 2, '0');
    next_alpha := alpha_part;
  ELSE
    next_num   := '01';
    next_alpha := fn_increment_alpha(alpha_part);
  END IF;

  new_code := prefix || next_alpha || next_num;

  UPDATE zi_code_sequences
  SET last_sequence = new_code,
      total_issued  = total_issued + 1,
      updated_at    = NOW()
  WHERE code_prefix = prefix;

  RETURN new_code;
END;
$$;

-- ============================================================
-- fn_next_year_code(prefix TEXT, year_2digit INT) → TEXT
--    Year-scoped version for transactions.
--    fn_next_year_code('LN', 26) → 'LN26A01'
--    The prefix stored in zi_code_sequences is 'LN26' (prefix+year).
-- ============================================================
CREATE OR REPLACE FUNCTION fn_next_year_code(prefix TEXT, year_2digit INT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_prefix TEXT;
BEGIN
  year_prefix := prefix || lpad(year_2digit::TEXT, 2, '0');
  RETURN fn_next_code(year_prefix);
END;
$$;

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

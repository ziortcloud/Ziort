
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

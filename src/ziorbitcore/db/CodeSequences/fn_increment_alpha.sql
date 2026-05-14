

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

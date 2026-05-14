
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

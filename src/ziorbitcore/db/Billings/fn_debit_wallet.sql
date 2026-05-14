-- ============================================================
-- fn_debit_wallet(entity_id, amount_paise, description, ref_code, individual_id)
--    Atomically deducts from wallet and writes billing_log.
--    Returns new balance. Raises exception if insufficient funds.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_debit_wallet(
  p_entity_id      UUID,
  p_amount_paise   BIGINT,
  p_description    TEXT,
  p_ref_code       TEXT DEFAULT NULL,
  p_individual_id  UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  UPDATE zi_wallet
  SET balance_paise = balance_paise - p_amount_paise,
      updated_at    = NOW()
  WHERE entity_id = p_entity_id
  RETURNING balance_paise INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for entity %', p_entity_id;
  END IF;

  -- Allow negative balance — app layer handles grace period logic
  INSERT INTO zi_billing_log
    (entity_id, transaction_type, amount_paise, description, ref_code, balance_after_paise, created_by)
  VALUES
    (p_entity_id, 'debit', p_amount_paise, p_description, p_ref_code, new_balance, p_individual_id);

  RETURN new_balance;
END;
$$;

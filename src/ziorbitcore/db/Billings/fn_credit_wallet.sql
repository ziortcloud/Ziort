
-- ============================================================
-- fn_credit_wallet(entity_id, amount_paise, description, ref_code, individual_id)
--    Atomically credits wallet and writes billing_log.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_credit_wallet(
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
  INSERT INTO zi_wallet (entity_id, balance_paise)
  VALUES (p_entity_id, p_amount_paise)
  ON CONFLICT (entity_id)
  DO UPDATE SET
    balance_paise = zi_wallet.balance_paise + p_amount_paise,
    updated_at    = NOW()
  RETURNING balance_paise INTO new_balance;

  INSERT INTO zi_billing_log
    (entity_id, transaction_type, amount_paise, description, ref_code, balance_after_paise, created_by)
  VALUES
    (p_entity_id, 'credit', p_amount_paise, p_description, p_ref_code, new_balance, p_individual_id);

  RETURN new_balance;
END;
$$;
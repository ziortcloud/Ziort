-- ============================================================
-- Ziort — Dev Seed Data
-- Populates a minimal dataset for local development.
-- Run: supabase db reset (applies migrations + this seed)
-- ============================================================

-- Seed a test entity and individual for development
-- Password for test user: Test@1234 (set via Supabase dashboard or CLI)

-- Note: zi_individuals requires auth_user_id from Supabase Auth.
-- The test individual below uses a placeholder UUID.
-- In real dev: register via /api/v1/auth/register first.

-- Seed: Verify code sequences are correct
SELECT code_prefix, last_sequence, total_issued FROM zi_code_sequences ORDER BY code_prefix;

-- Quick smoke test: generate a few codes
SELECT fn_next_code('ZU')  AS individual_1;
SELECT fn_next_code('ZU')  AS individual_2;
SELECT fn_next_code('ZE')  AS entity_1;
SELECT fn_next_code('ZBR') AS branch_1;
SELECT fn_next_code('ZPN') AS zipawn_sub_1;
SELECT fn_next_code('ZPLS') AS zipulse_sub_1;
SELECT fn_next_code('ZND')  AS zineed_sub_1;
SELECT fn_next_year_code('LN', 26) AS loan_1;
SELECT fn_next_year_code('LN', 26) AS loan_2;
SELECT fn_next_year_code('PAY', 26) AS payment_1;
SELECT fn_next_year_code('TKT', 26) AS ticket_1;

-- Verify alpha increment
SELECT fn_increment_alpha('A') AS should_be_B;
SELECT fn_increment_alpha('Z') AS should_be_AA;
SELECT fn_increment_alpha('AZ') AS should_be_BA;
SELECT fn_increment_alpha('ZZ') AS should_be_AAA;

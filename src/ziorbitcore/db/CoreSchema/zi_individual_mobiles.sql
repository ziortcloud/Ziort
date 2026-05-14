
-- ============================================================
-- 3. zi_individual_mobiles
--    Mobile history with recycling protection (12 month cooldown).
-- ============================================================
CREATE TABLE zi_individual_mobiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id     UUID NOT NULL REFERENCES zi_individuals(id),
  mobile_hash       TEXT NOT NULL UNIQUE,           -- SHA256 of full E.164 number
  mobile_last4      TEXT NOT NULL,                  -- last 4 digits for display
  country_dial_code TEXT NOT NULL,                  -- +91, +1, +971
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  became_current_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_at       TIMESTAMPTZ,
  cooldown_until    TIMESTAMPTZ                     -- replaced_at + 12 months
);

CREATE INDEX idx_ind_mobiles_hash ON zi_individual_mobiles(mobile_hash);
CREATE INDEX idx_ind_mobiles_individual ON zi_individual_mobiles(individual_id);
s
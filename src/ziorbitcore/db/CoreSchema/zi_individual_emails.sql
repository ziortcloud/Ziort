
-- ============================================================
-- 2. zi_individual_emails
--    Email history — current + previous. Email never expires.
-- ============================================================
CREATE TABLE zi_individual_emails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id     UUID NOT NULL REFERENCES zi_individuals(id),
  email             TEXT NOT NULL,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  became_current_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_at       TIMESTAMPTZ,
  UNIQUE(individual_id, email)
);

CREATE INDEX idx_ind_emails_email ON zi_individual_emails(email);
CREATE INDEX idx_ind_emails_individual ON zi_individual_emails(individual_id);
s
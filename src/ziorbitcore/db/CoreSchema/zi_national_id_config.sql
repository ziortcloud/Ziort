

-- ============================================================
-- 9. zi_national_id_config
--    Country-specific ID configuration.
-- ============================================================
CREATE TABLE zi_national_id_config (
  country_code       TEXT PRIMARY KEY,
  country_name       TEXT NOT NULL,
  individual_id_name TEXT,                         -- Aadhaar, SSN, NRIC, Emirates ID
  individual_format  TEXT,                         -- regex for validation
  business_id_name   TEXT,                         -- GST, CIN, EIN, UEN
  business_format    TEXT,
  store_raw          BOOLEAN NOT NULL DEFAULT FALSE,
  store_hash         BOOLEAN NOT NULL DEFAULT TRUE,
  display_last       INT NOT NULL DEFAULT 6,
  verify_api         TEXT
);

-- Seed country configs
INSERT INTO zi_national_id_config VALUES
  ('IN', 'India',       'Aadhaar',    '^\d{12}$',              'GST/CIN/MSME', NULL,         FALSE, TRUE, 6, 'https://api.uidai.gov.in'),
  ('US', 'USA',         'SSN',        '^\d{9}$',               'EIN',          '^\d{9}$',    FALSE, TRUE, 6, NULL),
  ('AE', 'UAE',         'Emirates ID','^\d{15}$',              'Trade License', NULL,         FALSE, TRUE, 6, NULL),
  ('SG', 'Singapore',   'NRIC',       '^[STFG]\d{7}[A-Z]$',   'UEN',          NULL,         FALSE, TRUE, 6, NULL),
  ('GB', 'UK',          'NI Number',  '^[A-Z]{2}\d{6}[A-Z]$', 'Companies House', NULL,      FALSE, TRUE, 6, NULL),
  ('MY', 'Malaysia',    'MyKad',      '^\d{12}$',              'SSM',          NULL,         FALSE, TRUE, 6, NULL);
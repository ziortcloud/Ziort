-- ============================================================
-- Ziort — Migration 024: ZiScan (Smart Document Scanner + OCR)
-- Product code: ZSCN  |  Table prefix: zsc_
-- Tagline: Scan. Extract. Digitise. Done.
-- Run after: 023_zipartner.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS zsc_documents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code              TEXT NOT NULL UNIQUE,              -- SCNA01
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,
  subscription_id      UUID NOT NULL REFERENCES zi_subscriptions(id) ON DELETE CASCADE,

  document_type        TEXT NOT NULL DEFAULT 'OTHER'
                         CHECK (document_type IN (
                           'INVOICE','RECEIPT','CONTRACT','ID_PROOF','PAN','AADHAAR',
                           'GSTIN','BANK_STATEMENT','RENT_AGREEMENT','OTHER'
                         )),
  title                TEXT NOT NULL,
  description          TEXT,

  -- Storage
  file_url             TEXT NOT NULL,                    -- Supabase Storage URL
  file_name            TEXT NOT NULL,
  file_size_bytes      BIGINT,
  mime_type            TEXT,
  page_count           INT DEFAULT 1,
  thumbnail_url        TEXT,

  -- OCR result
  ocr_status           TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (ocr_status IN ('PENDING','PROCESSING','DONE','FAILED')),
  ocr_text             TEXT,                             -- raw extracted text
  ocr_confidence       NUMERIC(5,2),                     -- 0-100%
  ocr_language         TEXT DEFAULT 'en',
  extracted_data       JSONB,                            -- structured fields from OCR

  -- Metadata
  source               TEXT DEFAULT 'UPLOAD'
                         CHECK (source IN ('UPLOAD','CAMERA','EMAIL','WHATSAPP')),
  tags                 TEXT[],
  is_archived          BOOLEAN NOT NULL DEFAULT false,

  created_by           UUID NOT NULL REFERENCES zi_individuals(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsc_documents_entity  ON zsc_documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_zsc_documents_type    ON zsc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_zsc_documents_status  ON zsc_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_zsc_documents_date    ON zsc_documents(created_at DESC);

-- Full text search on OCR text
CREATE INDEX IF NOT EXISTS idx_zsc_documents_ocr_fts ON zsc_documents
  USING gin(to_tsvector('english', coalesce(ocr_text, '')));

CREATE TABLE IF NOT EXISTS zsc_scan_jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID NOT NULL REFERENCES zsc_documents(id) ON DELETE CASCADE,
  entity_id            UUID NOT NULL REFERENCES zi_entities(id) ON DELETE CASCADE,

  provider             TEXT NOT NULL DEFAULT 'INTERNAL'  -- 'GOOGLE_VISION', 'TESSERACT', 'INTERNAL'
                         CHECK (provider IN ('INTERNAL','GOOGLE_VISION','AWS_TEXTRACT','TESSERACT')),
  status               TEXT NOT NULL DEFAULT 'QUEUED'
                         CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED')),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  error_message        TEXT,

  raw_response         JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zsc_jobs_document ON zsc_scan_jobs(document_id);

ALTER TABLE zsc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE zsc_scan_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY zsc_documents_deny ON zsc_documents FOR ALL USING (false);
CREATE POLICY zsc_scan_jobs_deny ON zsc_scan_jobs FOR ALL USING (false);

INSERT INTO zi_feature_flags (product_code, flag_key, label, plan_tiers) VALUES
  ('ZSCN', 'ziscan_upload',    'Document Upload & Storage', '["solo","plus","pro"]'),
  ('ZSCN', 'ziscan_ocr',       'OCR Text Extraction',       '["plus","pro"]'),
  ('ZSCN', 'ziscan_extract',   'Structured Data Extraction','["pro"]'),
  ('ZSCN', 'ziscan_fts',       'Full Text Search',          '["plus","pro"]')
ON CONFLICT (product_code, flag_key) DO NOTHING;

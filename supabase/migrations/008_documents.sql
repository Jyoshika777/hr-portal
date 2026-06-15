-- ── Migration 008 : Document Management System ────────────────────────────────
-- Run this entire script in Supabase Dashboard → SQL Editor → New query

-- ══ 1. Storage bucket ══════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-documents',
  'hr-documents',
  FALSE,
  10485760,   -- 10 MB per file
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit  = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ══ 2. Storage RLS policies ═════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hr_docs_upload"  ON storage.objects;
DROP POLICY IF EXISTS "hr_docs_read"   ON storage.objects;
DROP POLICY IF EXISTS "hr_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "hr_docs_update" ON storage.objects;

CREATE POLICY "hr_docs_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hr-documents');

CREATE POLICY "hr_docs_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'hr-documents');

CREATE POLICY "hr_docs_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'hr-documents');

CREATE POLICY "hr_docs_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hr-documents')
  WITH CHECK (bucket_id = 'hr-documents');

-- ══ 3. documents table ══════════════════════════════════════════════════════════
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number   TEXT         NOT NULL UNIQUE,

  -- Polymorphic entity link (candidate | employee)
  entity_type       TEXT         NOT NULL,
  entity_id         UUID,                         -- optional FK to candidates/employees
  entity_ref        TEXT         NOT NULL,         -- e.g. TVSSNWIN001 | TVSSNEMP001
  entity_name       TEXT         NOT NULL,         -- denormalised for display

  -- Document classification
  document_type     TEXT         NOT NULL DEFAULT 'other',
  document_name     TEXT         NOT NULL,         -- user-friendly title
  original_filename TEXT         NOT NULL,
  file_size         BIGINT       NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type         TEXT         NOT NULL,

  -- Storage location
  storage_path      TEXT         NOT NULL UNIQUE,
  storage_bucket    TEXT         NOT NULL DEFAULT 'hr-documents',

  -- Verification
  is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
  verified_by       TEXT,
  verified_at       TIMESTAMPTZ,

  -- Internal
  remarks           TEXT,
  uploaded_by       TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- ── Constraints ──────────────────────────────────────────────────────────────
  CONSTRAINT chk_doc_entity_type CHECK (entity_type IN ('candidate', 'employee')),
  CONSTRAINT chk_doc_type CHECK (document_type IN (
    'resume', 'offer_letter', 'appointment_letter', 'id_proof',
    'certificate', 'experience_letter', 'nda', 'contract', 'other'
  )),
  CONSTRAINT chk_doc_verified CHECK (
    (is_verified = FALSE) OR
    (is_verified = TRUE AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
  )
);

-- ── Auto-update updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_document_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_document_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX idx_doc_entity_ref    ON documents (entity_ref);
CREATE INDEX idx_doc_entity_type   ON documents (entity_type);
CREATE INDEX idx_doc_entity_id     ON documents (entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_doc_document_type ON documents (document_type);
CREATE INDEX idx_doc_is_verified   ON documents (is_verified);
CREATE INDEX idx_doc_created_at    ON documents (created_at DESC);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY docs_all_authenticated
  ON documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

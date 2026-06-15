-- ── Migration 010 : Company Assets Storage Bucket ────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor → New query
-- Creates the public 'company-assets' bucket for company logos.

-- ══ 1. Storage bucket ════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  TRUE,          -- public: logo URLs need to be embeddable without auth
  2097152,       -- 2 MB max per file
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;

-- ══ 2. RLS Policies ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "company_assets_select"  ON storage.objects;
DROP POLICY IF EXISTS "company_assets_insert"  ON storage.objects;
DROP POLICY IF EXISTS "company_assets_update"  ON storage.objects;
DROP POLICY IF EXISTS "company_assets_delete"  ON storage.objects;

-- Public read (logo must be embeddable without JWT)
CREATE POLICY "company_assets_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

-- Authenticated users can upload
CREATE POLICY "company_assets_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

-- Authenticated users can overwrite (upsert)
CREATE POLICY "company_assets_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING  (bucket_id = 'company-assets')
  WITH CHECK (bucket_id = 'company-assets');

-- Authenticated users can delete
CREATE POLICY "company_assets_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets');

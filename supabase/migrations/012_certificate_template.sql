-- Add template field to certificates table (012)
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'classic';

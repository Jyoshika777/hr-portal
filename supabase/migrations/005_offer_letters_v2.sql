-- ════════════════════════════════════════════════════════════════════════════
--  Migration 005 — Offer Letters v2
--  Adds 4 new employment types (temporary, trainee, remote, hybrid) and
--  all type-specific columns required for enterprise PDF generation.
--
--  RUN OPTION A  (fresh install / safe to destroy existing data):
--    Paste and run the whole file in Supabase SQL Editor.
--
--  RUN OPTION B  (existing offer_letters rows you want to keep):
--    Skip the DROP/CREATE block and run only the ALTER TABLE block
--    at the bottom of this file.
-- ════════════════════════════════════════════════════════════════════════════

-- ── OPTION A: Drop and recreate ──────────────────────────────────────────────
DROP TABLE IF EXISTS offer_letters CASCADE;

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE offer_letters (

  -- ── Core identity ──────────────────────────────────────────────────────────
  id                      UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_number            TEXT           UNIQUE NOT NULL,
  candidate_id            UUID,                          -- nullable FK → candidates.id
  candidate_name          TEXT           NOT NULL,
  candidate_email         TEXT           NOT NULL,
  candidate_phone         TEXT           NOT NULL,

  -- ── Role & department ──────────────────────────────────────────────────────
  job_role                TEXT           NOT NULL,
  department              TEXT           NOT NULL,
  employment_type         TEXT           NOT NULL DEFAULT 'full_time',

  -- ── Dates & compensation ───────────────────────────────────────────────────
  date_of_joining         DATE           NOT NULL,
  salary                  NUMERIC(12,2)  NOT NULL,       -- monthly gross (all types)
  offer_date              DATE           NOT NULL DEFAULT CURRENT_DATE,
  expiry_date             DATE,                          -- nullable: no fixed expiry if omitted

  -- ── Status & notes ─────────────────────────────────────────────────────────
  status                  TEXT           NOT NULL DEFAULT 'draft',
  remarks                 TEXT           NOT NULL DEFAULT '',
  roles_responsibilities  TEXT           NOT NULL DEFAULT '',

  -- ── Full-Time / Part-Time / Remote / Hybrid specific ──────────────────────
  annual_ctc              NUMERIC(12,2),                 -- computed or overridden CTC
  probation_months        INT,                           -- probation period in months
  notice_period_days      INT,                           -- notice period in calendar days
  employee_benefits       TEXT           NOT NULL DEFAULT '',   -- health, PF, gratuity, etc.
  leave_policy            TEXT           NOT NULL DEFAULT '',   -- annual / sick / casual leave

  -- ── Internship specific ────────────────────────────────────────────────────
  internship_duration     TEXT           NOT NULL DEFAULT '',   -- e.g. "6 months"
  learning_objectives     TEXT           NOT NULL DEFAULT '',   -- newline-separated objectives

  -- ── Contract / Temporary specific ─────────────────────────────────────────
  contract_duration       TEXT           NOT NULL DEFAULT '',   -- e.g. "12 months"
  project_assignment      TEXT           NOT NULL DEFAULT '',   -- project / scope description
  renewal_conditions      TEXT           NOT NULL DEFAULT '',   -- terms for renewal

  -- ── Trainee specific ──────────────────────────────────────────────────────
  training_duration       TEXT           NOT NULL DEFAULT '',   -- e.g. "3 months"
  training_stipend        NUMERIC(12,2),                 -- monthly stipend during training

  -- ── Audit ─────────────────────────────────────────────────────────────────
  created_at              TIMESTAMPTZ    DEFAULT NOW(),

  -- ── CHECK constraints ─────────────────────────────────────────────────────
  CONSTRAINT chk_offer_status
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  CONSTRAINT chk_offer_employment_type
    CHECK (employment_type IN (
      'full_time', 'part_time', 'contract', 'intern',
      'temporary', 'trainee', 'remote', 'hybrid'
    )),

  CONSTRAINT chk_offer_salary_positive
    CHECK (salary > 0),

  CONSTRAINT chk_offer_expiry_after_offer_date
    CHECK (expiry_date IS NULL OR expiry_date >= offer_date),

  CONSTRAINT chk_offer_annual_ctc_positive
    CHECK (annual_ctc IS NULL OR annual_ctc > 0),

  CONSTRAINT chk_offer_probation_positive
    CHECK (probation_months IS NULL OR probation_months > 0),

  CONSTRAINT chk_offer_notice_positive
    CHECK (notice_period_days IS NULL OR notice_period_days > 0),

  CONSTRAINT chk_offer_training_stipend_positive
    CHECK (training_stipend IS NULL OR training_stipend > 0)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Fast lookup by candidate when loading candidate profile
CREATE INDEX idx_offer_letters_candidate_id
  ON offer_letters (candidate_id)
  WHERE candidate_id IS NOT NULL;

-- Status filter used heavily in list view
CREATE INDEX idx_offer_letters_status
  ON offer_letters (status);

-- Default sort order in OfferLetterList (created_at DESC)
CREATE INDEX idx_offer_letters_created_at
  ON offer_letters (created_at DESC);

-- Offer date range queries / sorting
CREATE INDEX idx_offer_letters_offer_date
  ON offer_letters (offer_date DESC);

-- Employment type filter for dashboard metrics
CREATE INDEX idx_offer_letters_employment_type
  ON offer_letters (employment_type);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE offer_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage offer_letters"
  ON offer_letters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Reload PostgREST schema cache ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════════
--  OPTION B — ALTER TABLE (run this block INSTEAD of the DROP/CREATE above
--  if you already have offer_letters rows you want to keep)
-- ════════════════════════════════════════════════════════════════════════════
/*
-- 1. Widen the employment_type constraint to include 4 new types
ALTER TABLE offer_letters
  DROP CONSTRAINT IF EXISTS chk_offer_employment_type;

ALTER TABLE offer_letters
  ADD CONSTRAINT chk_offer_employment_type
    CHECK (employment_type IN (
      'full_time', 'part_time', 'contract', 'intern',
      'temporary', 'trainee', 'remote', 'hybrid'
    ));

-- 2. Full-Time / Remote / Hybrid columns
ALTER TABLE offer_letters
  ADD COLUMN IF NOT EXISTS annual_ctc          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS probation_months    INT,
  ADD COLUMN IF NOT EXISTS notice_period_days  INT,
  ADD COLUMN IF NOT EXISTS employee_benefits   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS leave_policy        TEXT NOT NULL DEFAULT '';

-- 3. Internship columns
ALTER TABLE offer_letters
  ADD COLUMN IF NOT EXISTS internship_duration  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS learning_objectives  TEXT NOT NULL DEFAULT '';

-- 4. Contract / Temporary columns
ALTER TABLE offer_letters
  ADD COLUMN IF NOT EXISTS contract_duration    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_assignment   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS renewal_conditions   TEXT NOT NULL DEFAULT '';

-- 5. Trainee columns
ALTER TABLE offer_letters
  ADD COLUMN IF NOT EXISTS training_duration    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS training_stipend     NUMERIC(12,2);

-- 6. Additional positive-value constraints
ALTER TABLE offer_letters
  ADD CONSTRAINT chk_offer_annual_ctc_positive
    CHECK (annual_ctc IS NULL OR annual_ctc > 0),
  ADD CONSTRAINT chk_offer_probation_positive
    CHECK (probation_months IS NULL OR probation_months > 0),
  ADD CONSTRAINT chk_offer_notice_positive
    CHECK (notice_period_days IS NULL OR notice_period_days > 0),
  ADD CONSTRAINT chk_offer_training_stipend_positive
    CHECK (training_stipend IS NULL OR training_stipend > 0);

-- 7. New index for employment type filter
CREATE INDEX IF NOT EXISTS idx_offer_letters_employment_type
  ON offer_letters (employment_type);

NOTIFY pgrst, 'reload schema';
*/


-- ════════════════════════════════════════════════════════════════════════════
--  Verification queries — run these after the migration to confirm success
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Column list — must return exactly 27 rows
SELECT
  ordinal_position  AS "#",
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'offer_letters'
ORDER BY ordinal_position;

-- 2. Constraints — expect: 1 PRIMARY KEY, 1 UNIQUE, 8 CHECK constraints
SELECT
  conname        AS constraint_name,
  contype        AS type,   -- p=primary key, u=unique, c=check
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'offer_letters'::regclass
ORDER BY contype, conname;

-- 3. Indexes — expect: 6 indexes (1 PK implicit + 1 UNIQUE + 5 explicit)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'offer_letters'
ORDER BY indexname;

-- 4. RLS policies — expect 1 row
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'offer_letters';

-- 5. Quick employment-type sanity check
SELECT employment_type, COUNT(*) AS total
FROM offer_letters
GROUP BY employment_type
ORDER BY employment_type;

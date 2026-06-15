-- ── Drop and recreate ─────────────────────────────────────
DROP TABLE IF EXISTS offer_letters CASCADE;

-- ── Table ─────────────────────────────────────────────────
CREATE TABLE offer_letters (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_number    TEXT          UNIQUE NOT NULL,
  candidate_id    UUID,                                     -- nullable: links to candidates.id when generated from a candidate
  candidate_name  TEXT          NOT NULL,
  candidate_email TEXT          NOT NULL,
  candidate_phone TEXT          NOT NULL,
  job_role        TEXT          NOT NULL,
  department      TEXT          NOT NULL,
  employment_type TEXT          NOT NULL DEFAULT 'full_time',
  date_of_joining DATE          NOT NULL,
  salary          NUMERIC(12,2) NOT NULL,
  offer_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE,                                     -- nullable: no fixed expiry if omitted
  status                TEXT          NOT NULL DEFAULT 'draft',
  remarks               TEXT          NOT NULL DEFAULT '',
  roles_responsibilities TEXT         NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ   DEFAULT NOW(),

  -- ── CHECK constraints ───────────────────────────────────
  CONSTRAINT chk_offer_status
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  CONSTRAINT chk_offer_employment_type
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),

  CONSTRAINT chk_offer_salary_positive
    CHECK (salary > 0),

  CONSTRAINT chk_offer_expiry_after_offer_date
    CHECK (expiry_date IS NULL OR expiry_date >= offer_date)
);

-- ── Indexes ────────────────────────────────────────────────
-- Fast lookup by candidate when loading candidate profile
CREATE INDEX idx_offer_letters_candidate_id
  ON offer_letters (candidate_id)
  WHERE candidate_id IS NOT NULL;

-- Status filter used heavily in the list view
CREATE INDEX idx_offer_letters_status
  ON offer_letters (status);

-- Default sort order in OfferLetterList (created_at DESC)
CREATE INDEX idx_offer_letters_created_at
  ON offer_letters (created_at DESC);

-- Offer date range queries / sorting
CREATE INDEX idx_offer_letters_offer_date
  ON offer_letters (offer_date DESC);

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE offer_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage offer_letters"
  ON offer_letters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Reload PostgREST schema cache ─────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── If you already ran this migration (existing data), run instead:
-- ALTER TABLE offer_letters ADD COLUMN IF NOT EXISTS
--   roles_responsibilities TEXT NOT NULL DEFAULT '';
-- NOTIFY pgrst, 'reload schema';

-- ── Verification queries ───────────────────────────────────

-- 1. Column list — must return exactly 17 rows
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

-- 2. Constraints — must show 1 UNIQUE + 1 PRIMARY KEY + 4 CHECK constraints
SELECT
  conname        AS constraint_name,
  contype        AS type,   -- p=primary key, u=unique, c=check
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'offer_letters'::regclass
ORDER BY contype, conname;

-- 3. Indexes — must show 5 indexes (1 PK + 1 UNIQUE + 4 explicit)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'offer_letters'
ORDER BY indexname;

-- 4. RLS policy
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'offer_letters';

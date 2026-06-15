-- ── Migration 007 : Employee Performance Reviews ─────────────────────────────
-- Run this entire script in Supabase Dashboard → SQL Editor → New query

DROP TABLE IF EXISTS performance_reviews CASCADE;

CREATE TABLE performance_reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_number    TEXT        NOT NULL UNIQUE,

  -- Employee snapshot (denormalised for history integrity)
  employee_id      UUID        REFERENCES employees(id) ON DELETE CASCADE,
  employee_ref     TEXT        NOT NULL,   -- e.g. TVSSNEMP001
  employee_name    TEXT        NOT NULL,
  department       TEXT,
  designation      TEXT,

  -- Review metadata
  review_type      TEXT        NOT NULL DEFAULT 'annual',
  review_period_start DATE,
  review_period_end   DATE,
  review_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  reviewer_name    TEXT        NOT NULL,
  reviewer_designation TEXT,

  -- Category ratings (1–5 integers, all optional except if overall_rating is null)
  rating_technical     INTEGER,
  rating_communication INTEGER,
  rating_teamwork      INTEGER,
  rating_punctuality   INTEGER,
  rating_initiative    INTEGER,

  -- Overall computed rating (app-side average, stored for querying)
  overall_rating   NUMERIC(3,1),
  rating_label     TEXT,

  -- Textual sections
  performance_notes    TEXT,
  achievements         TEXT,
  areas_for_improvement TEXT,
  goals_next_period    TEXT,
  behavior_feedback    TEXT,

  -- Outcome
  recommendation   TEXT        NOT NULL DEFAULT 'no_action',
  status           TEXT        NOT NULL DEFAULT 'draft',

  -- Sharing & internal
  is_shared_with_employee BOOLEAN NOT NULL DEFAULT FALSE,
  remarks          TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Constraints ────────────────────────────────────────────────────────────
  CONSTRAINT chk_perf_review_type CHECK (review_type IN (
    'annual','quarterly','probation','pip','promotion','warning','commendation','exit'
  )),
  CONSTRAINT chk_perf_recommendation CHECK (recommendation IN (
    'promote','retain','pip','warning_letter','terminate',
    'no_action','salary_increment','role_change'
  )),
  CONSTRAINT chk_perf_status CHECK (status IN (
    'draft','submitted','acknowledged','closed'
  )),
  CONSTRAINT chk_perf_rating_label CHECK (rating_label IN (
    'outstanding','exceeds_expectations','meets_expectations',
    'needs_improvement','unsatisfactory'
  ) OR rating_label IS NULL),
  CONSTRAINT chk_perf_overall_rating    CHECK (overall_rating    IS NULL OR overall_rating    BETWEEN 1.0 AND 5.0),
  CONSTRAINT chk_perf_rating_technical  CHECK (rating_technical  IS NULL OR rating_technical  BETWEEN 1 AND 5),
  CONSTRAINT chk_perf_rating_comm       CHECK (rating_communication IS NULL OR rating_communication BETWEEN 1 AND 5),
  CONSTRAINT chk_perf_rating_teamwork   CHECK (rating_teamwork   IS NULL OR rating_teamwork   BETWEEN 1 AND 5),
  CONSTRAINT chk_perf_rating_punctual   CHECK (rating_punctuality IS NULL OR rating_punctuality BETWEEN 1 AND 5),
  CONSTRAINT chk_perf_rating_initiative CHECK (rating_initiative  IS NULL OR rating_initiative  BETWEEN 1 AND 5),
  CONSTRAINT chk_perf_period_order CHECK (
    review_period_start IS NULL OR review_period_end IS NULL
    OR review_period_end >= review_period_start
  )
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_performance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_performance_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION set_performance_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_perf_employee_ref  ON performance_reviews (employee_ref);
CREATE INDEX idx_perf_employee_id   ON performance_reviews (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_perf_review_type   ON performance_reviews (review_type);
CREATE INDEX idx_perf_status        ON performance_reviews (status);
CREATE INDEX idx_perf_review_date   ON performance_reviews (review_date DESC);
CREATE INDEX idx_perf_created_at    ON performance_reviews (created_at DESC);
CREATE INDEX idx_perf_overall       ON performance_reviews (overall_rating DESC NULLS LAST);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY perf_all_authenticated
  ON performance_reviews
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

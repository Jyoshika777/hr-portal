CREATE TABLE IF NOT EXISTS candidates (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id TEXT      UNIQUE NOT NULL,
  full_name    TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  job_role     TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'applied',
  remarks      TEXT        NOT NULL DEFAULT '',
  applied_date DATE        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage candidates"
  ON candidates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

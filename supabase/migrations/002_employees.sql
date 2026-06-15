DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE employees (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     TEXT        UNIQUE NOT NULL,
  full_name       TEXT        NOT NULL,
  email           TEXT        UNIQUE NOT NULL,
  phone           TEXT        NOT NULL,
  department      TEXT        NOT NULL,
  designation     TEXT        NOT NULL,
  employment_type TEXT        NOT NULL DEFAULT 'full_time',
  status          TEXT        NOT NULL DEFAULT 'active',
  date_of_joining DATE        NOT NULL,
  remarks         TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

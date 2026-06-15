-- 011_certificates.sql
-- Certificates issued to employees, interns, and trainees

CREATE TABLE IF NOT EXISTS certificates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT        UNIQUE NOT NULL,
  recipient_name     TEXT        NOT NULL,
  employee_id        TEXT,
  certificate_type   TEXT        NOT NULL CHECK (certificate_type IN (
    'internship_completion', 'training_completion', 'employee_recognition',
    'appreciation', 'achievement', 'course_completion'
  )),
  program_name       TEXT,
  start_date         DATE,
  end_date           DATE,
  issue_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  signatory_name     TEXT        NOT NULL DEFAULT 'Bhanu Pratap Dadi',
  signatory_title    TEXT        NOT NULL DEFAULT 'Chief Executive Officer',
  verification_code  TEXT        UNIQUE NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'revoked')),
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_certificates" ON certificates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_certificates_updated_at();

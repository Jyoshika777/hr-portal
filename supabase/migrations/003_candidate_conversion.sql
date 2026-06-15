-- Track when a candidate has been converted to an employee record
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS converted_employee_id UUID;

NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'candidates'
ORDER BY ordinal_position;

-- 1) Add transfer_policy_scope to existing institutions table
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS transfer_policy_scope TEXT NOT NULL DEFAULT 'institution'
  CHECK (transfer_policy_scope IN ('institution', 'program'));

-- 2) Set WGU as program-scoped
UPDATE institutions 
SET transfer_policy_scope = 'program', updated_at = now()
WHERE code = 'WGU';

-- 3) Ensure COSC is institution-scoped (if exists)
UPDATE institutions 
SET transfer_policy_scope = 'institution', updated_at = now()
WHERE code = 'COSC';

-- 4) Policy scan findings table (for program-scoped skips)
CREATE TABLE IF NOT EXISTS policy_scan_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution TEXT NOT NULL,
  academic_year TEXT,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  urls_scanned JSONB,
  confidence_score INT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_scan_findings_inst_year
  ON policy_scan_findings (institution, academic_year, created_at DESC);

-- 5) Enable RLS on new table
ALTER TABLE policy_scan_findings ENABLE ROW LEVEL SECURITY;

-- 6) Public read policy
CREATE POLICY "Allow public read on policy_scan_findings"
  ON policy_scan_findings FOR SELECT USING (true)
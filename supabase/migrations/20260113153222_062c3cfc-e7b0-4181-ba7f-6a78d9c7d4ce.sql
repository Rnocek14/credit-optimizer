-- First, deduplicate existing findings by keeping only the most recent one per (run_id, template_id, check_name)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY run_id, template_id, check_name ORDER BY created_at DESC) as rn
  FROM audit_findings
)
DELETE FROM audit_findings
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add the uniqueness constraint
ALTER TABLE audit_findings
ADD CONSTRAINT audit_findings_unique_check
UNIQUE (run_id, template_id, check_name);

-- Add index to support the constraint efficiently (also useful for querying)
CREATE INDEX IF NOT EXISTS idx_audit_findings_run_template_check 
ON audit_findings(run_id, template_id, check_name);
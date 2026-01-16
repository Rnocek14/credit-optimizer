-- Add index for degree_templates view performance in promotion candidates
-- This speeds up the correlated subqueries that count active/pending templates
CREATE INDEX IF NOT EXISTS idx_degree_templates_institution_status 
ON degree_templates (institution_code, status);
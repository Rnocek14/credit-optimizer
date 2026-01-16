-- Fix ID type mismatch: degree_templates.id is TEXT, so template_id should be TEXT too
-- This allows storing both UUID and text-based IDs consistently

-- 1) Convert template_id from uuid to text
ALTER TABLE template_invariant_reports
  ALTER COLUMN template_id TYPE text USING template_id::text;

-- 2) Ensure it's always present (should already be NOT NULL but be explicit)
ALTER TABLE template_invariant_reports
  ALTER COLUMN template_id SET NOT NULL;

-- 3) Add optimized index for sentinel queries (replaces less specific indexes)
CREATE INDEX IF NOT EXISTS idx_template_invariant_reports_lookup
  ON template_invariant_reports (template_table, institution_code, template_id, created_at DESC);

-- 4) Add index for joining back to templates
CREATE INDEX IF NOT EXISTS idx_template_invariant_reports_template_id
  ON template_invariant_reports (template_id);
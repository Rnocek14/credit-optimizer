-- Create template_invariant_reports table for audit trail
CREATE TABLE public.template_invariant_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_table TEXT NOT NULL CHECK (template_table IN ('degree_templates', 'program_templates')),
  template_id UUID NOT NULL,
  institution_code TEXT NOT NULL,
  program_code TEXT,
  run_source TEXT NOT NULL CHECK (run_source IN ('seeder', 'worker', 'manual', 'cron')),
  ok BOOLEAN NOT NULL,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookups by template
CREATE INDEX idx_invariant_reports_template ON template_invariant_reports(template_table, template_id);

-- Index for finding failures
CREATE INDEX idx_invariant_reports_failures ON template_invariant_reports(ok, created_at DESC) WHERE ok = false;

-- Index for institution-level reporting
CREATE INDEX idx_invariant_reports_institution ON template_invariant_reports(institution_code, created_at DESC);

-- Enable RLS
ALTER TABLE template_invariant_reports ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions)
CREATE POLICY "Service role has full access to invariant reports"
ON template_invariant_reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read reports (for admin dashboards)
CREATE POLICY "Authenticated users can read invariant reports"
ON template_invariant_reports
FOR SELECT
TO authenticated
USING (true);

-- Add comment for documentation
COMMENT ON TABLE template_invariant_reports IS 'Audit trail for template credit invariant checks - ensures templates are internally consistent';
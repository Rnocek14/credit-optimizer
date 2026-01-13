
-- Upgrade template_generation_queue with worker state fields
ALTER TABLE template_generation_queue 
  ADD COLUMN IF NOT EXISTS attempt_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update status to use worker-compatible values (queued already exists)
-- Add index for fast worker claims
CREATE INDEX IF NOT EXISTS idx_tgq_worker_claim 
  ON template_generation_queue (status, priority_score DESC, updated_at ASC)
  WHERE status = 'queued';

-- Create program_templates output table
CREATE TABLE IF NOT EXISTS program_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_catalog_id uuid NOT NULL REFERENCES program_catalog(id) ON DELETE CASCADE,
  institution_code text NOT NULL,
  program_slug text NOT NULL,
  track text NOT NULL CHECK (track IN ('standard', 'alt_max', 'fastest', 'cheapest', 'hybrid')),
  template_json jsonb NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  tokens_used int,
  generation_time_ms int,
  generated_at timestamptz NOT NULL DEFAULT now(),
  source_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Idempotency constraint: one template per program per track
  CONSTRAINT uq_program_templates_program_track UNIQUE (program_catalog_id, track)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_program_templates_institution 
  ON program_templates (institution_code, program_slug);

-- Enable RLS
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

-- Public read policy (templates are reference data)
CREATE POLICY "Program templates are publicly readable"
  ON program_templates FOR SELECT
  USING (true);

-- Service role insert/update policy
CREATE POLICY "Service role can manage program templates"
  ON program_templates FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_program_templates_updated_at
  BEFORE UPDATE ON program_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Template Generation Job Queue
-- Enables reliable, retryable template generation with proper locking

CREATE TABLE template_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution text NOT NULL,
  program_code text NULL,
  pack_id uuid NULL REFERENCES institution_policy_packs(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','canceled')),
  priority int NOT NULL DEFAULT 50,

  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text NULL,

  locked_at timestamptz NULL,
  locked_by text NULL,
  run_after timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  
  -- Results summary
  templates_created int NULL,
  templates_updated int NULL,
  invariants_passed int NULL,
  invariants_failed int NULL
);

-- Prevent duplicate jobs for same target while queued/running
CREATE UNIQUE INDEX uq_template_jobs_dedupe
ON template_generation_jobs (institution, COALESCE(program_code,''), status)
WHERE status IN ('queued','running');

-- Fast lookup for next jobs to process
CREATE INDEX idx_template_jobs_next
ON template_generation_jobs (status, run_after, priority DESC, created_at);

-- Enable RLS
ALTER TABLE template_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read jobs (admin enforcement in app code)
CREATE POLICY "Authenticated users can read jobs" ON template_generation_jobs
FOR SELECT TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_template_generation_jobs_updated_at
BEFORE UPDATE ON template_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
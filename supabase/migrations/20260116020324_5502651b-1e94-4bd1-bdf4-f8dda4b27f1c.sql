-- Fix 1: Create safe claim RPC with SKIP LOCKED
CREATE OR REPLACE FUNCTION claim_template_generation_jobs(
  p_worker_id text,
  p_batch_size int DEFAULT 5
)
RETURNS SETOF template_generation_jobs
LANGUAGE sql
SET search_path = public
AS $$
  WITH picked AS (
    SELECT id
    FROM template_generation_jobs
    WHERE status = 'queued'
      AND run_after <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE template_generation_jobs j
  SET status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  WHERE j.id IN (SELECT id FROM picked)
  RETURNING j.*;
$$;

-- Fix 2: Add dedupe_key generated column and safe unique index
ALTER TABLE template_generation_jobs
  ADD COLUMN IF NOT EXISTS dedupe_key text GENERATED ALWAYS AS 
  (institution || '|' || COALESCE(program_code, '')) STORED;

-- Drop old problematic index if exists
DROP INDEX IF EXISTS uq_template_jobs_dedupe;

-- Create proper partial unique index on generated column
CREATE UNIQUE INDEX uq_template_jobs_dedupe
ON template_generation_jobs (dedupe_key)
WHERE status IN ('queued', 'running');

-- Fix 3: Add job_id to template_invariant_reports for linking
ALTER TABLE template_invariant_reports
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES template_generation_jobs(id) ON DELETE SET NULL;
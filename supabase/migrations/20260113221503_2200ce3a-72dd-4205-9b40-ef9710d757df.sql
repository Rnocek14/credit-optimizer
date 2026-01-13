
-- Create atomic claim function with SKIP LOCKED
CREATE OR REPLACE FUNCTION claim_template_generation_jobs(
  p_institution_code text DEFAULT NULL,
  p_batch_size int DEFAULT 3,
  p_worker_id text DEFAULT 'unknown'
)
RETURNS SETOF template_generation_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT tgq.id
    FROM template_generation_queue tgq
    JOIN program_catalog pc ON pc.id = tgq.program_catalog_id
    WHERE tgq.status = 'queued'
      AND tgq.eligibility_status = 'needs_review'
      AND (p_institution_code IS NULL OR pc.institution_code = p_institution_code)
    ORDER BY tgq.priority_score DESC, tgq.updated_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE template_generation_queue tgq
  SET 
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = attempt_count + 1,
    last_attempt_at = now(),
    updated_at = now()
  FROM claimed
  WHERE tgq.id = claimed.id
  RETURNING tgq.*;
END;
$$;

-- Grant execute to anon/authenticated for edge function access
GRANT EXECUTE ON FUNCTION claim_template_generation_jobs TO anon, authenticated, service_role;

-- ============================================
-- Atomic Claim RPC for Bulk Rerun Queue
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_claim_bulk_rerun_queue(
  p_job_id uuid,
  p_batch_size int DEFAULT 10
)
RETURNS TABLE(id uuid, template_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH claimed AS (
  SELECT q.id
  FROM bulk_rerun_queue q
  WHERE q.job_id = p_job_id
    AND q.status = 'queued'
  ORDER BY q.id
  FOR UPDATE SKIP LOCKED
  LIMIT p_batch_size
)
UPDATE bulk_rerun_queue q
SET
  status = 'running',
  started_at = now(),
  attempts = q.attempts + 1
FROM claimed
WHERE q.id = claimed.id
RETURNING q.id, q.template_id;
$$;

-- ============================================
-- Atomic Increment Counters RPC
-- Prevents race conditions when multiple workers update
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_increment_bulk_job_counters(
  p_job_id uuid,
  p_processed int DEFAULT 0,
  p_succeeded int DEFAULT 0,
  p_failed int DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
UPDATE bulk_rerun_jobs
SET
  processed = processed + p_processed,
  succeeded = succeeded + p_succeeded,
  failed = failed + p_failed,
  last_heartbeat_at = now()
WHERE id = p_job_id;
$$;

-- ============================================
-- Get Remaining Queue Count RPC
-- Returns count of queued + running items
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_get_bulk_queue_remaining(
  p_job_id uuid
)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT COUNT(*)::int
FROM bulk_rerun_queue
WHERE job_id = p_job_id
  AND status IN ('queued', 'running');
$$;

-- ============================================
-- Check and Complete Job RPC
-- Atomically checks if job is complete and updates status
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_check_and_complete_bulk_job(
  p_job_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining int;
  v_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_status FROM bulk_rerun_jobs WHERE id = p_job_id;
  
  -- Already completed
  IF v_status IN ('succeeded', 'failed', 'canceled') THEN
    RETURN v_status;
  END IF;
  
  -- Count remaining
  SELECT COUNT(*) INTO v_remaining
  FROM bulk_rerun_queue
  WHERE job_id = p_job_id
    AND status IN ('queued', 'running');
  
  -- If no remaining, mark complete
  IF v_remaining = 0 THEN
    UPDATE bulk_rerun_jobs
    SET status = 'succeeded', completed_at = now()
    WHERE id = p_job_id;
    RETURN 'succeeded';
  END IF;
  
  RETURN 'running';
END;
$$;
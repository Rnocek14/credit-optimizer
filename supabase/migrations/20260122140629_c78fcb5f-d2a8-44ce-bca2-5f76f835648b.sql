
-- ===========================================
-- Reset Stuck Policy Runs RPC + Self-Healing
-- ===========================================

-- Admin function to automatically fix stuck "running" runs
-- Based on task completion status
CREATE OR REPLACE FUNCTION public.reset_stuck_policy_runs(p_stuck_minutes int DEFAULT 60)
RETURNS TABLE (
  run_id uuid, 
  old_status text, 
  new_status text, 
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_total int;
  v_complete int;
  v_failed int;
  v_active int;
BEGIN
  FOR r IN
    SELECT id, status, created_at
    FROM transfer_batch_runs
    WHERE status = 'running'
      AND created_at < now() - (p_stuck_minutes || ' minutes')::interval
  LOOP
    -- Count task statuses for this run
    SELECT
      count(*),
      count(*) FILTER (WHERE status IN ('complete', 'done', 'succeeded')),
      count(*) FILTER (WHERE status IN ('failed', 'error')),
      count(*) FILTER (WHERE status IN ('queued', 'running', 'processing', 'pending'))
    INTO v_total, v_complete, v_failed, v_active
    FROM policy_refresh_tasks
    WHERE policy_refresh_tasks.run_id = r.id;

    IF COALESCE(v_total, 0) = 0 THEN
      -- No task records; mark as failed so it can be re-run
      UPDATE transfer_batch_runs
      SET status = 'failed',
          finished_at = now(),
          summary = COALESCE(summary, '{}'::jsonb) || 
            jsonb_build_object('reset_reason', 'stuck running with no tasks', 'reset_at', now())
      WHERE id = r.id;

      run_id := r.id; old_status := 'running'; new_status := 'failed';
      reason := 'no tasks found'; RETURN NEXT;

    ELSIF v_active = 0 AND v_failed = 0 THEN
      -- All tasks done, no failures - mark complete
      UPDATE transfer_batch_runs
      SET status = 'complete',
          finished_at = now(),
          summary = COALESCE(summary, '{}'::jsonb) || 
            jsonb_build_object('reset_reason', 'all tasks complete', 'reset_at', now())
      WHERE id = r.id;

      run_id := r.id; old_status := 'running'; new_status := 'complete';
      reason := format('all %s tasks done', v_total); RETURN NEXT;

    ELSIF v_active = 0 AND v_failed > 0 THEN
      -- No active tasks but some failed - mark as complete with errors
      UPDATE transfer_batch_runs
      SET status = 'complete',
          finished_at = now(),
          summary = COALESCE(summary, '{}'::jsonb) || 
            jsonb_build_object(
              'reset_reason', 'completed with failures',
              'reset_at', now(),
              'failed_count', v_failed,
              'complete_count', v_complete
            )
      WHERE id = r.id;

      run_id := r.id; old_status := 'running'; new_status := 'complete';
      reason := format('%s done, %s failed', v_complete, v_failed); RETURN NEXT;

    ELSE
      -- Still has active tasks but stuck - force fail for re-queue
      UPDATE transfer_batch_runs
      SET status = 'failed',
          finished_at = now(),
          summary = COALESCE(summary, '{}'::jsonb) || 
            jsonb_build_object(
              'reset_reason', 'stuck with stale active tasks',
              'reset_at', now(),
              'active_count', v_active,
              'total_count', v_total
            )
      WHERE id = r.id;

      run_id := r.id; old_status := 'running'; new_status := 'failed';
      reason := format('stuck: %s active, %s total', v_active, v_total); RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (admin check happens in app layer)
GRANT EXECUTE ON FUNCTION public.reset_stuck_policy_runs(int) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.reset_stuck_policy_runs IS 
'Resets policy refresh runs stuck in "running" status. 
Analyzes task completion to determine correct final status.
Default: resets runs stuck for >60 minutes.';

-- ===========================================
-- Immediately fix the currently stuck run
-- ===========================================
UPDATE transfer_batch_runs
SET status = 'complete',
    finished_at = now(),
    summary = COALESCE(summary, '{}'::jsonb) || 
      jsonb_build_object(
        'reset_reason', 'migration fix for Jan 13 stuck run',
        'reset_at', now()
      )
WHERE id = '5aa1a818-9918-4b24-828e-3cb180083011'
  AND status = 'running';

-- Fix cron wrapper parameter mismatch
-- The invoke_edge_function parameters were renamed to p_function_name and p_body
-- but this wrapper still uses the old names (name, body), causing cron failures

CREATE OR REPLACE FUNCTION util.run_evidence_backfill_worker(batch_size integer DEFAULT 25)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  got_lock boolean;
BEGIN
  -- Try to acquire advisory lock to prevent overlapping runs
  got_lock := pg_try_advisory_lock(8675309);
  IF NOT got_lock THEN
    RAISE NOTICE 'evidence-backfill-worker: skipped (lock held)';
    RETURN;
  END IF;

  BEGIN
    -- Fixed: Use correct parameter names (p_function_name, p_body)
    PERFORM util.invoke_edge_function(
      p_function_name => 'evidence-backfill-worker',
      p_body => jsonb_build_object('batch_size', batch_size, 'dry_run', false)
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(8675309);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(8675309);
END;
$$;
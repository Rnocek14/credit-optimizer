-- Add advisory locks to prevent overlapping cron runs

-- Update evidence backfill worker to use advisory lock
CREATE OR REPLACE FUNCTION util.run_evidence_backfill_worker(
  batch_size int DEFAULT 25
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  got_lock boolean;
BEGIN
  -- Try to acquire advisory lock (unique ID: 8675309 for evidence worker)
  got_lock := pg_try_advisory_lock(8675309);
  IF NOT got_lock THEN
    RAISE NOTICE 'evidence-backfill-worker: skipped (lock held by another run)';
    RETURN;
  END IF;

  -- Invoke the edge function
  PERFORM util.invoke_edge_function(
    name => 'evidence-backfill-worker',
    body => jsonb_build_object(
      'batch_size', batch_size,
      'dry_run', false
    )
  );

  -- Release the lock
  PERFORM pg_advisory_unlock(8675309);
END;
$$;

-- Update truth scan to use advisory lock
CREATE OR REPLACE FUNCTION util.run_degree_truth_scan(
  program_code text DEFAULT 'BSBA',
  auto_fix boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  got_lock boolean;
BEGIN
  -- Try to acquire advisory lock (unique ID: 8675310 for truth scan)
  got_lock := pg_try_advisory_lock(8675310);
  IF NOT got_lock THEN
    RAISE NOTICE 'degree-truth-scan: skipped (lock held by another run)';
    RETURN;
  END IF;

  -- Invoke the edge function
  PERFORM util.invoke_edge_function(
    name => 'run-degree-truth-scan',
    body => jsonb_build_object(
      'program_code', program_code,
      'auto_fix', auto_fix
    )
  );

  -- Release the lock
  PERFORM pg_advisory_unlock(8675310);
END;
$$;

-- Add comments
COMMENT ON FUNCTION util.run_evidence_backfill_worker IS 'Scheduled worker with advisory lock to prevent overlapping runs';
COMMENT ON FUNCTION util.run_degree_truth_scan IS 'Scheduled nightly truth scan with advisory lock to prevent overlapping runs';
-- Update advisory lock functions to always release locks even on error

CREATE OR REPLACE FUNCTION util.run_evidence_backfill_worker(batch_size int DEFAULT 25)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  got_lock boolean;
BEGIN
  got_lock := pg_try_advisory_lock(8675309);
  IF NOT got_lock THEN
    RAISE NOTICE 'evidence-backfill-worker: skipped (lock held)';
    RETURN;
  END IF;

  BEGIN
    PERFORM util.invoke_edge_function(
      name => 'evidence-backfill-worker',
      body => jsonb_build_object('batch_size', batch_size, 'dry_run', false)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Always release lock on error, then re-raise so cron logs the failure
    PERFORM pg_advisory_unlock(8675309);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(8675309);
END;
$$;

CREATE OR REPLACE FUNCTION util.run_degree_truth_scan(
  program_code text DEFAULT 'BSBA',
  auto_fix boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  got_lock boolean;
BEGIN
  got_lock := pg_try_advisory_lock(8675310);
  IF NOT got_lock THEN
    RAISE NOTICE 'degree-truth-scan: skipped (lock held)';
    RETURN;
  END IF;

  BEGIN
    PERFORM util.invoke_edge_function(
      name => 'run-degree-truth-scan',
      body => jsonb_build_object('program_code', program_code, 'auto_fix', auto_fix)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Always release lock on error, then re-raise so cron logs the failure
    PERFORM pg_advisory_unlock(8675310);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(8675310);
END;
$$;

-- Also fix search_path on invoke_edge_function
CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  name text,
  body jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text := 'https://vzpissitddpunkpythsb.supabase.co';
  service_role_key text;
BEGIN
  -- Get service role key from vault (or use anon for public functions)
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If no service role key, use anon key for verify_jwt=false functions
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI';
  END IF;

  -- Use pg_net to POST to the edge function
  PERFORM net.http_post(
    url := project_url || '/functions/v1/' || name,
    body := body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  );
END;
$$;
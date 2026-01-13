-- Enable pg_cron extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create utility schema if not exists
CREATE SCHEMA IF NOT EXISTS util;

-- Create helper function to invoke edge functions via pg_net
-- This uses the documented Supabase pattern for invoking edge functions from SQL
CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  name text,
  body jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create wrapper function for evidence backfill worker
CREATE OR REPLACE FUNCTION util.run_evidence_backfill_worker(
  batch_size int DEFAULT 25
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM util.invoke_edge_function(
    name => 'evidence-backfill-worker',
    body => jsonb_build_object(
      'batch_size', batch_size,
      'dry_run', false
    )
  );
END;
$$;

-- Create wrapper function for truth scan
CREATE OR REPLACE FUNCTION util.run_degree_truth_scan(
  program_code text DEFAULT 'BSBA',
  auto_fix boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM util.invoke_edge_function(
    name => 'run-degree-truth-scan',
    body => jsonb_build_object(
      'program_code', program_code,
      'auto_fix', auto_fix
    )
  );
END;
$$;

-- Schedule evidence backfill worker to run every 15 minutes
SELECT cron.schedule(
  'evidence-backfill-worker-15m',
  '*/15 * * * *',
  $$ SELECT util.run_evidence_backfill_worker(25); $$
);

-- Schedule truth scan to run nightly at 2 AM UTC
SELECT cron.schedule(
  'degree-truth-scan-nightly',
  '0 2 * * *',
  $$ SELECT util.run_degree_truth_scan('BSBA', true); $$
);

-- Add comment
COMMENT ON FUNCTION util.invoke_edge_function IS 'Helper to invoke Supabase Edge Functions via pg_net';
COMMENT ON FUNCTION util.run_evidence_backfill_worker IS 'Scheduled worker to backfill evidence URLs for transfer rules';
COMMENT ON FUNCTION util.run_degree_truth_scan IS 'Scheduled nightly truth scan for degree templates';
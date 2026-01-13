-- Clean up stuck historical runs
UPDATE program_catalog_runs 
SET status = 'failed', 
    error_message = 'stale_run_pre_openai_fix',
    finished_at = now()
WHERE status = 'running'
  AND started_at < now() - interval '1 hour';
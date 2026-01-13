
-- Add heartbeat and progress columns for run monitoring
ALTER TABLE program_catalog_runs 
ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
ADD COLUMN IF NOT EXISTS programs_processed integer DEFAULT 0;

-- Add comment for stuck run detection
COMMENT ON COLUMN program_catalog_runs.heartbeat_at IS 'Last heartbeat timestamp - runs with status=running and heartbeat_at < now()-15min are stuck';

-- Add unique index to prevent duplicate diffs per run+institution+field
CREATE UNIQUE INDEX IF NOT EXISTS uniq_policy_refresh_diffs 
ON policy_refresh_diffs(run_id, institution, field_name);
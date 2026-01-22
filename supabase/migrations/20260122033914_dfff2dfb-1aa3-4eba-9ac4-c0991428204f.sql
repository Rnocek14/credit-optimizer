-- Add indexes for policy_change_audit performance
CREATE INDEX IF NOT EXISTS idx_policy_change_audit_institution_created 
  ON policy_change_audit (institution_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_change_audit_scan_run 
  ON policy_change_audit (scan_run_id);

CREATE INDEX IF NOT EXISTS idx_policy_change_audit_batch_run 
  ON policy_change_audit (batch_run_id) 
  WHERE batch_run_id IS NOT NULL;

-- Add index for content_changed queries (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_policy_change_audit_changed 
  ON policy_change_audit (content_changed, created_at DESC) 
  WHERE content_changed = true;

-- Comment on retention (implement via scheduled job if needed):
-- DELETE FROM policy_change_audit WHERE created_at < NOW() - INTERVAL '90 days';
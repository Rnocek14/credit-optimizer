-- Add idempotency constraint to prevent duplicate snapshots
-- Uses (template_id, invariant_version) since each template should only have one snapshot per version
CREATE UNIQUE INDEX IF NOT EXISTS idx_invariant_decision_snapshots_idempotency 
ON invariant_decision_snapshots (template_id, invariant_version);

-- Also add a comment for clarity
COMMENT ON INDEX idx_invariant_decision_snapshots_idempotency IS 
'Ensures one snapshot per template per invariant version (prevents retries from creating duplicates)';
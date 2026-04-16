-- Add validation layer columns to transfer_rule_candidates
ALTER TABLE transfer_rule_candidates
ADD COLUMN IF NOT EXISTS validation_result JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_score NUMERIC(4,3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_flags TEXT[] DEFAULT '{}';

-- Index for finding unvalidated candidates
CREATE INDEX IF NOT EXISTS idx_trc_unvalidated 
ON transfer_rule_candidates (status, validated_at) 
WHERE validated_at IS NULL AND status = 'pending';

-- Index for validation score range queries (promotion gating)
CREATE INDEX IF NOT EXISTS idx_trc_validation_score 
ON transfer_rule_candidates (validation_score DESC) 
WHERE status = 'pending';

COMMENT ON COLUMN transfer_rule_candidates.validation_result IS 'Detailed validation check results: format, catalog match, title similarity, normalization';
COMMENT ON COLUMN transfer_rule_candidates.validation_score IS 'Computed validation confidence 0-1 that gates auto-promotion independently of AI confidence';
COMMENT ON COLUMN transfer_rule_candidates.validation_flags IS 'Array of specific validation issues found e.g. unknown_source_code, no_catalog_match';
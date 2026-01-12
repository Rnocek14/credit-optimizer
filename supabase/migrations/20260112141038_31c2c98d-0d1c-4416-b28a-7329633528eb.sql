-- Add evidence_type column for distinguishing policy vs equivalency evidence
ALTER TABLE credit_transfer_rules
ADD COLUMN IF NOT EXISTS evidence_type text;

-- Add comment for clarity
COMMENT ON COLUMN credit_transfer_rules.evidence_type IS 'Type of evidence: policy_provider_acceptance, equivalency_table, catalog_statement, other_official';
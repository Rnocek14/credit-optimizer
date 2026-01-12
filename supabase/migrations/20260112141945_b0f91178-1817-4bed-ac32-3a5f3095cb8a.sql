-- Add CHECK constraint for evidence_type to prevent junk values
ALTER TABLE credit_transfer_rules
ADD CONSTRAINT credit_transfer_rules_evidence_type_check
CHECK (evidence_type IS NULL OR evidence_type IN (
  'policy_provider_acceptance',
  'equivalency_table',
  'catalog_statement',
  'other_official'
));

-- Add index for efficient evidence type queries
CREATE INDEX IF NOT EXISTS idx_ctr_target_evidence_type
ON credit_transfer_rules (target_institution, evidence_type);
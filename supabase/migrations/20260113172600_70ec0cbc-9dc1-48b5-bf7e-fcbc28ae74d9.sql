-- Drop old constraint and add expanded one with new types
ALTER TABLE credit_transfer_rules DROP CONSTRAINT IF EXISTS credit_transfer_rules_evidence_type_check;

ALTER TABLE credit_transfer_rules ADD CONSTRAINT credit_transfer_rules_evidence_type_check
  CHECK (
    evidence_type IS NULL OR 
    evidence_type = ANY(ARRAY[
      'policy_provider_acceptance',
      'equivalency_table', 
      'catalog_statement',
      'other_official',
      'equivalency_page',
      'catalog_page',
      'course_specific',
      'manual'
    ])
  );

-- Backfill evidence_type for existing rules with evidence (use policy_provider_acceptance for institution pages)
UPDATE credit_transfer_rules
SET evidence_type = 'policy_provider_acceptance'
WHERE evidence_url IS NOT NULL 
  AND LENGTH(TRIM(evidence_url)) > 0
  AND evidence_type IS NULL;
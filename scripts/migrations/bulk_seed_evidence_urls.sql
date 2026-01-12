-- Bulk seed evidence URLs for transfer rules
-- Run this via Supabase SQL Editor after the schema migration
-- Only seeds rules with confidence >= 0.85 to avoid promoting shaky rules to Tier A

-- TESU: Policy-level evidence for major providers
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.tesu.edu/transfer-credit',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance'),
  updated_at = NOW()
WHERE target_institution = 'TESU'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND source_institution IN ('SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP', 'DSST', 'AP')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- COSC: Policy-level evidence
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.charteroak.edu/current-students/registrar/transfer-credits.php',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance'),
  updated_at = NOW()
WHERE target_institution = 'COSC'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- WGU: Policy-level evidence
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.wgu.edu/admissions/transfers.html',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance'),
  updated_at = NOW()
WHERE target_institution = 'WGU'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- Excelsior: Policy-level evidence
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.excelsior.edu/admissions/credit-for-prior-learning/',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance'),
  updated_at = NOW()
WHERE target_institution = 'EXCELSIOR'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- Verification query: run after updates to confirm results
-- SELECT
--   target_institution,
--   COUNT(*) AS total,
--   COUNT(*) FILTER (WHERE evidence_url IS NOT NULL) AS with_evidence,
--   COUNT(*) FILTER (WHERE evidence_url IS NOT NULL AND COALESCE(confidence,0) >= 0.9) AS tier_a_ready
-- FROM credit_transfer_rules
-- GROUP BY target_institution
-- ORDER BY target_institution;

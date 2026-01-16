-- Bulk seed evidence URLs for transfer rules
-- Run this via Supabase SQL Editor after the schema migration
-- Only seeds rules with confidence >= 0.85 to avoid promoting shaky rules to Tier A

-- TESU: Policy-level evidence for major providers
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.tesu.edu/transfer-credit',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance')
WHERE target_institution = 'TESU'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND source_institution IN ('SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP', 'DSST', 'AP')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- COSC: Policy-level evidence
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance')
WHERE target_institution = 'COSC'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- WGU: Policy-level evidence
UPDATE credit_transfer_rules
SET
  evidence_url = 'https://www.wgu.edu/admissions/transfers.html',
  rule_source = COALESCE(rule_source, 'Official transfer policy (provider-level)'),
  evidence_type = COALESCE(evidence_type, 'policy_provider_acceptance')
WHERE target_institution = 'WGU'
  AND (evidence_url IS NULL OR evidence_url = '')
  AND acceptance_status IN ('accepted', 'elective')
  AND COALESCE(confidence, 0) >= 0.85;

-- Note: EXCELSIOR has no rules in the database yet (0 matching rows)
-- Add Excelsior rules to credit_transfer_rules first, then re-run

-- Verification query: run after updates to confirm results
-- SELECT
--   target_institution,
--   COUNT(*) AS total,
--   COUNT(*) FILTER (WHERE evidence_url IS NOT NULL AND evidence_url <> '') AS with_evidence,
--   COUNT(*) FILTER (WHERE evidence_type = 'policy_provider_acceptance') AS policy_level,
--   COUNT(*) FILTER (WHERE evidence_url IS NOT NULL AND evidence_url <> '' AND COALESCE(confidence,0) >= 0.9) AS tier_a_ready
-- FROM credit_transfer_rules
-- WHERE target_institution IN ('TESU', 'COSC', 'WGU')
-- GROUP BY target_institution
-- ORDER BY target_institution;

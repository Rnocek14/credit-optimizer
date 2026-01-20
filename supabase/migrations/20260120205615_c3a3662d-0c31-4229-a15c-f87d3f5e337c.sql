-- V1.1 Server-Side Freshness: Create view for rule freshness status
-- TTLs by evidence_source_type (in days):
--   institution_pdf: 365 (annual catalog cycle)
--   institution_web: 180 (semi-annual refresh)
--   provider_page: 90 (quarterly check)
--   ace_nccrs: 365 (stable registry)
--   human_override: 180 (needs periodic revalidation)
--   NULL/unknown: treated as stale

CREATE OR REPLACE VIEW transfer_rule_freshness AS
SELECT 
  id,
  target_institution,
  source_institution,
  source_course_code,
  target_course_code,
  acceptance_status,
  evidence_url,
  evidence_source_type,
  last_verified_at,
  CASE
    -- No evidence = unknown
    WHEN evidence_url IS NULL THEN 'unknown'
    -- No verification date = stale
    WHEN last_verified_at IS NULL THEN 'stale'
    -- Apply TTL based on evidence type
    WHEN evidence_source_type = 'institution_pdf' 
      AND last_verified_at > NOW() - INTERVAL '365 days' THEN 'fresh'
    WHEN evidence_source_type = 'institution_web' 
      AND last_verified_at > NOW() - INTERVAL '180 days' THEN 'fresh'
    WHEN evidence_source_type = 'provider_page' 
      AND last_verified_at > NOW() - INTERVAL '90 days' THEN 'fresh'
    WHEN evidence_source_type = 'ace_nccrs' 
      AND last_verified_at > NOW() - INTERVAL '365 days' THEN 'fresh'
    WHEN evidence_source_type = 'human_override' 
      AND last_verified_at > NOW() - INTERVAL '180 days' THEN 'fresh'
    -- Default: if verified within 180 days, fresh
    WHEN last_verified_at > NOW() - INTERVAL '180 days' THEN 'fresh'
    ELSE 'stale'
  END AS freshness_status,
  CASE
    WHEN last_verified_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (NOW() - last_verified_at))::integer
  END AS days_since_verified,
  CASE
    WHEN evidence_source_type = 'institution_pdf' THEN 365
    WHEN evidence_source_type = 'institution_web' THEN 180
    WHEN evidence_source_type = 'provider_page' THEN 90
    WHEN evidence_source_type = 'ace_nccrs' THEN 365
    WHEN evidence_source_type = 'human_override' THEN 180
    ELSE 180
  END AS ttl_days
FROM credit_transfer_rules;

-- Add comment for documentation
COMMENT ON VIEW transfer_rule_freshness IS 'Server-side freshness computation for transfer rules. Freshness status: fresh/stale/unknown based on evidence_source_type TTLs.';
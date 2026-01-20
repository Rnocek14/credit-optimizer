-- V1.1 Bootstrap: Add inferred verification flag and enhanced view

-- 1) Add inferred flag column
ALTER TABLE credit_transfer_rules 
ADD COLUMN IF NOT EXISTS last_verified_at_inferred boolean DEFAULT false;

-- 2) Add index for freshness queries
CREATE INDEX IF NOT EXISTS idx_ctr_target_freshness
ON credit_transfer_rules (target_institution, evidence_source_type, last_verified_at);

-- 3) Drop and recreate the freshness view with corrected logic
DROP VIEW IF EXISTS transfer_rule_freshness;

CREATE VIEW transfer_rule_freshness AS
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
  last_verified_at_inferred,
  CASE
    -- No evidence = unknown
    WHEN evidence_url IS NULL THEN 'unknown'
    -- No verification date = unknown (not stale - we don't know when it was checked)
    WHEN last_verified_at IS NULL THEN 'unknown'
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
    -- Default TTL: 180 days
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

COMMENT ON VIEW transfer_rule_freshness IS 'Server-side freshness computation. Status: fresh/stale/unknown. Inferred flag indicates bootstrap verification.';

-- 4) Create full view for UI consumption
CREATE OR REPLACE VIEW transfer_rules_with_freshness AS
SELECT
  r.*,
  f.freshness_status,
  f.days_since_verified,
  f.ttl_days
FROM credit_transfer_rules r
JOIN transfer_rule_freshness f ON f.id = r.id;
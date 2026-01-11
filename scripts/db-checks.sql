-- =============================================================================
-- Transferability Wiring Checks
-- Phase A: SQL queries to detect missing/incomplete policy configuration
-- Run these to verify all anchor institutions are properly configured
-- =============================================================================

-- =============================================================================
-- CHECK 1: Templates missing policy packs
-- These institutions have degree templates but no corresponding policy pack
-- =============================================================================
SELECT 
  'templates_missing_policy' as check_name,
  t.institution_code as institution,
  COUNT(*) as template_count,
  'FAIL: No policy pack exists' as status
FROM degree_templates t
LEFT JOIN institution_policy_packs p ON p.institution = t.institution_code
WHERE p.id IS NULL
GROUP BY t.institution_code

UNION ALL

-- Templates check from marketplace fixtures (if using JSON templates)
SELECT 
  'static_check' as check_name,
  'TESU' as institution,
  1 as template_count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM institution_policy_packs WHERE institution = 'TESU' AND status = 'active')
    THEN 'PASS: Policy pack exists'
    ELSE 'FAIL: No active policy pack'
  END as status;

-- =============================================================================
-- CHECK 2: Policy packs with missing required numeric fields
-- These are the critical fields that must be non-null per the spec
-- =============================================================================
SELECT 
  institution,
  status,
  confidence_score,
  CASE WHEN policy_data->>'degree_credit_total' IS NULL THEN 'MISSING' ELSE 'OK' END as degree_total,
  CASE WHEN policy_data->'residency_requirement'->>'credits' IS NULL THEN 'MISSING' ELSE 'OK' END as residency,
  CASE WHEN policy_data->'transfer_credit_policy'->>'max_total_transfer' IS NULL THEN 'MISSING' ELSE 'OK' END as max_transfer,
  CASE WHEN policy_data->'transfer_credit_policy'->>'max_alt_credit' IS NULL THEN 'MISSING' ELSE 'OK' END as max_alt,
  CASE WHEN policy_data->'grade_rules'->>'min_transfer_grade' IS NULL THEN 'MISSING' ELSE 'OK' END as grade_rules,
  CASE WHEN policy_data->>'capstone_in_residence' IS NULL THEN 'MISSING' ELSE 'OK' END as capstone_rule
FROM institution_policy_packs
WHERE status IN ('active', 'draft')
ORDER BY status, institution;

-- =============================================================================
-- CHECK 3: Count of failures by field
-- Quick summary of which fields are most commonly missing
-- =============================================================================
SELECT 
  'missing_field_summary' as check_type,
  SUM(CASE WHEN policy_data->>'degree_credit_total' IS NULL THEN 1 ELSE 0 END) as missing_degree_total,
  SUM(CASE WHEN policy_data->'residency_requirement'->>'credits' IS NULL THEN 1 ELSE 0 END) as missing_residency,
  SUM(CASE WHEN policy_data->'transfer_credit_policy'->>'max_total_transfer' IS NULL THEN 1 ELSE 0 END) as missing_max_transfer,
  SUM(CASE WHEN policy_data->'transfer_credit_policy'->>'max_alt_credit' IS NULL THEN 1 ELSE 0 END) as missing_max_alt,
  SUM(CASE WHEN policy_data->>'capstone_in_residence' IS NULL THEN 1 ELSE 0 END) as missing_capstone_rule,
  COUNT(*) as total_packs
FROM institution_policy_packs
WHERE status IN ('active', 'draft');

-- =============================================================================
-- CHECK 4: Active policy packs per institution
-- Ensure each institution has exactly ONE active pack
-- =============================================================================
SELECT 
  institution,
  COUNT(*) as active_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'FAIL: No active pack'
    WHEN COUNT(*) = 1 THEN 'PASS: Single active pack'
    ELSE 'WARN: Multiple active packs'
  END as status
FROM institution_policy_packs
WHERE status = 'active'
GROUP BY institution
ORDER BY active_count DESC;

-- =============================================================================
-- CHECK 5: Capstone-in-residence requirement verification
-- Ensures all active packs have capstone_in_residence = true
-- =============================================================================
SELECT 
  institution,
  status,
  policy_data->>'capstone_in_residence' as capstone_in_residence,
  CASE 
    WHEN policy_data->>'capstone_in_residence' = 'true' THEN 'PASS'
    WHEN policy_data->>'capstone_in_residence' IS NULL THEN 'FAIL: Not specified'
    ELSE 'WARN: Set to false - verify this is intentional'
  END as validation
FROM institution_policy_packs
WHERE status = 'active';

-- =============================================================================
-- CHECK 6: Residency vs Max Transfer sanity check
-- Residency + Max Transfer should not exceed degree total
-- =============================================================================
SELECT 
  institution,
  (policy_data->>'degree_credit_total')::int as degree_total,
  (policy_data->'residency_requirement'->>'credits')::int as min_residency,
  (policy_data->'transfer_credit_policy'->>'max_total_transfer')::int as max_transfer,
  CASE 
    WHEN (policy_data->'residency_requirement'->>'credits')::int + 
         (policy_data->'transfer_credit_policy'->>'max_total_transfer')::int > 
         (policy_data->>'degree_credit_total')::int 
    THEN 'OK: Residency constrains transfer'
    WHEN (policy_data->'residency_requirement'->>'credits')::int + 
         (policy_data->'transfer_credit_policy'->>'max_total_transfer')::int = 
         (policy_data->>'degree_credit_total')::int 
    THEN 'OK: Exactly balanced'
    ELSE 'WARN: Gap between residency + max_transfer and degree_total'
  END as sanity_check
FROM institution_policy_packs
WHERE status = 'active'
  AND policy_data->>'degree_credit_total' IS NOT NULL;

-- =============================================================================
-- CHECK 7: Partner policies alignment
-- Cross-reference institution_policy_packs with legacy partner_policies table
-- =============================================================================
SELECT 
  pp.partner_code,
  pp.partner_name,
  pp.max_alt_credits as legacy_max_alt,
  pp.min_residency_credits as legacy_residency,
  (ipp.policy_data->'transfer_credit_policy'->>'max_alt_credit')::int as pack_max_alt,
  (ipp.policy_data->'residency_requirement'->>'credits')::int as pack_residency,
  CASE 
    WHEN ipp.id IS NULL THEN 'FAIL: No policy pack'
    WHEN pp.max_alt_credits != (ipp.policy_data->'transfer_credit_policy'->>'max_alt_credit')::int THEN 'WARN: Alt credit mismatch'
    WHEN pp.min_residency_credits != (ipp.policy_data->'residency_requirement'->>'credits')::int THEN 'WARN: Residency mismatch'
    ELSE 'PASS: Aligned'
  END as alignment_status
FROM partner_policies pp
LEFT JOIN institution_policy_packs ipp 
  ON ipp.institution = pp.partner_code 
  AND ipp.status = 'active';

-- =============================================================================
-- CHECK 8: Quick pass/fail summary
-- Returns a single row with overall status
-- =============================================================================
SELECT 
  'wiring_scan_summary' as check_name,
  (SELECT COUNT(*) FROM institution_policy_packs WHERE status = 'active') as active_packs,
  (SELECT COUNT(*) FROM institution_policy_packs 
   WHERE status = 'active' 
   AND policy_data->>'degree_credit_total' IS NOT NULL
   AND policy_data->'residency_requirement'->>'credits' IS NOT NULL
   AND policy_data->'transfer_credit_policy'->>'max_total_transfer' IS NOT NULL
   AND policy_data->>'capstone_in_residence' = 'true'
  ) as complete_packs,
  CASE 
    WHEN (SELECT COUNT(*) FROM institution_policy_packs WHERE status = 'active') = 
         (SELECT COUNT(*) FROM institution_policy_packs 
          WHERE status = 'active' 
          AND policy_data->>'degree_credit_total' IS NOT NULL
          AND policy_data->'residency_requirement'->>'credits' IS NOT NULL
          AND policy_data->>'capstone_in_residence' = 'true')
    THEN 'PASS: All active packs have required fields'
    ELSE 'FAIL: Some active packs missing required fields'
  END as overall_status;

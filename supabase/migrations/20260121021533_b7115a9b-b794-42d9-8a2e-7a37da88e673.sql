
-- ============================================================================
-- COMPLIANCE INVARIANT VIEWS: Tripwires for automated monitoring
-- ============================================================================

-- Invariant 1: Policy rules must never resolve to a canonical
CREATE OR REPLACE VIEW public.invariant_policy_rules_never_resolve AS
SELECT 
  id,
  rule_provider_norm,
  source_course_code,
  effective_rule_scope,
  resolved_source_course_id,
  canonical_resolution_status
FROM public.transfer_rules_resolved
WHERE effective_rule_scope = 'policy'
  AND resolved_source_course_id IS NOT NULL;

-- Invariant 2: No empty normalized codes should exist
CREATE OR REPLACE VIEW public.invariant_no_empty_norm_codes AS
SELECT 
  id,
  rule_provider_norm,
  source_course_code,
  rule_course_code_norm
FROM public.transfer_rules_resolved
WHERE rule_course_code_norm = '';

-- Combined health check view for single-query monitoring
CREATE OR REPLACE VIEW public.system_invariant_health AS
SELECT
  (SELECT count(*) FROM public.invariant_policy_rules_never_resolve) AS policy_resolution_violations,
  (SELECT count(*) FROM public.invariant_no_empty_norm_codes) AS empty_norm_violations,
  (SELECT count(*) FROM public.provider_registry_gaps) AS registry_gap_count,
  (SELECT count(*) FROM public.transfer_rules_resolved 
   WHERE effective_rule_scope <> 'policy' AND canonical_resolution_status = 'legacy_unmapped') AS unmapped_course_rules,
  CASE 
    WHEN (SELECT count(*) FROM public.invariant_policy_rules_never_resolve) = 0
     AND (SELECT count(*) FROM public.invariant_no_empty_norm_codes) = 0
     AND (SELECT count(*) FROM public.provider_registry_gaps) = 0
     AND (SELECT count(*) FROM public.transfer_rules_resolved 
          WHERE effective_rule_scope <> 'policy' AND canonical_resolution_status = 'legacy_unmapped') = 0
    THEN 'healthy'
    ELSE 'degraded'
  END AS overall_status;

COMMENT ON VIEW public.invariant_policy_rules_never_resolve IS 'Compliance tripwire: Should always be empty. Policy rules must never resolve to canonical.';
COMMENT ON VIEW public.invariant_no_empty_norm_codes IS 'Compliance tripwire: Should always be empty. Empty-string codes indicate normalization bug.';
COMMENT ON VIEW public.system_invariant_health IS 'Single-query health check for all compliance invariants. overall_status = healthy means all invariants pass.';

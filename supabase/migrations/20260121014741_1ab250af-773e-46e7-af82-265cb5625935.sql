-- Unified provider resolution stats view
-- Single source of truth for dashboards

CREATE OR REPLACE VIEW public.provider_resolution_stats AS
SELECT 
  source_institution AS provider,
  COUNT(*) FILTER (WHERE rule_scope = 'course') AS course_total,
  COUNT(*) FILTER (WHERE rule_scope = 'course' AND canonical_resolution_status IN ('canonical', 'alias_resolved', 'canonical_match')) AS course_resolved,
  COUNT(*) FILTER (WHERE rule_scope = 'course' AND canonical_resolution_status = 'legacy_unmapped') AS course_unmapped,
  COUNT(*) FILTER (WHERE rule_scope = 'policy') AS policy_total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rule_scope = 'course' AND canonical_resolution_status IN ('canonical', 'alias_resolved', 'canonical_match')) /
    NULLIF(COUNT(*) FILTER (WHERE rule_scope = 'course'), 0)
  , 1) AS course_resolution_pct,
  NOW() AS computed_at
FROM transfer_rules_resolved
GROUP BY source_institution
ORDER BY course_resolved DESC;

COMMENT ON VIEW public.provider_resolution_stats IS
'Unified stats view for provider canonical resolution. Use this for all dashboards to ensure consistent metrics.';
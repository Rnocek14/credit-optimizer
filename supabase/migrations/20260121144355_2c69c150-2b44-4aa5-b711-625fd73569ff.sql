-- Single-pane release gate: one row, one decision (self-contained)
CREATE OR REPLACE VIEW public.operational_health_dashboard AS
WITH counts AS (
  SELECT
    (SELECT COUNT(*) FROM public.invariant_pattern_url_mismatch) AS pattern_url_mismatch,
    (SELECT COUNT(*) FROM public.invariant_pattern_provider_root_urls) AS pattern_root_urls,
    (SELECT COUNT(*) FROM public.invariant_stored_provider_missing_urls) AS stored_missing_urls,
    (SELECT COUNT(*) FROM public.invariant_no_empty_norm_codes) AS empty_norm_codes,
    (SELECT COUNT(*) FROM public.invariant_enrichment_no_invalid_writes) AS invalid_writes,
    (SELECT COUNT(*) FROM public.invariant_policy_rules_never_resolve) AS policy_never_resolve
)
SELECT
  CASE
    WHEN pattern_url_mismatch = 0
     AND pattern_root_urls = 0
     AND stored_missing_urls = 0
     AND empty_norm_codes = 0
     AND invalid_writes = 0
     AND policy_never_resolve = 0
    THEN 'GREEN'
    ELSE 'RED'
  END AS overall_gate,
  CASE
    WHEN pattern_url_mismatch = 0
     AND pattern_root_urls = 0
     AND stored_missing_urls = 0
     AND empty_norm_codes = 0
     AND invalid_writes = 0
     AND policy_never_resolve = 0
    THEN 'healthy'
    ELSE 'unhealthy'
  END AS invariant_status,
  counts.*,
  now() AS checked_at
FROM counts;

COMMENT ON VIEW public.operational_health_dashboard IS 'Single-row release gate: overall_gate = GREEN means all invariants pass. Use for CI/ops gating.';
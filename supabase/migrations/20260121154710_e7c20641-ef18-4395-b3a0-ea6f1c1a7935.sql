-- Drop and recreate to change column structure
DROP VIEW IF EXISTS public.operational_health_dashboard;

CREATE VIEW public.operational_health_dashboard AS
WITH expected AS (
  SELECT unnest(ARRAY[
    'invariant_pattern_url_mismatch',
    'invariant_pattern_provider_root_urls',
    'invariant_stored_provider_missing_urls',
    'invariant_no_empty_norm_codes',
    'invariant_enrichment_no_invalid_writes',
    'invariant_policy_rules_never_resolve'
  ]) AS name
),
present AS (
  SELECT viewname AS name
  FROM pg_views
  WHERE schemaname = 'public'
),
missing AS (
  SELECT COUNT(*) AS missing_invariants
  FROM expected e
  LEFT JOIN present p USING (name)
  WHERE p.name IS NULL
),
counts AS (
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
    WHEN m.missing_invariants > 0 THEN 'RED'
    WHEN (
      counts.pattern_url_mismatch = 0 AND
      counts.pattern_root_urls = 0 AND
      counts.stored_missing_urls = 0 AND
      counts.empty_norm_codes = 0 AND
      counts.invalid_writes = 0 AND
      counts.policy_never_resolve = 0
    )
    THEN 'GREEN'
    ELSE 'RED'
  END AS overall_gate,
  CASE
    WHEN m.missing_invariants > 0 THEN 'missing_invariants'
    WHEN (
      counts.pattern_url_mismatch = 0 AND
      counts.pattern_root_urls = 0 AND
      counts.stored_missing_urls = 0 AND
      counts.empty_norm_codes = 0 AND
      counts.invalid_writes = 0 AND
      counts.policy_never_resolve = 0
    )
    THEN 'healthy'
    ELSE 'unhealthy'
  END AS invariant_status,
  m.missing_invariants,
  counts.*,
  now() AS checked_at
FROM missing m
CROSS JOIN counts;

COMMENT ON VIEW public.operational_health_dashboard IS 'Single-row release gate: overall_gate = GREEN means all 6 invariants exist AND pass. missing_invariants > 0 = RED even if counts would pass.';
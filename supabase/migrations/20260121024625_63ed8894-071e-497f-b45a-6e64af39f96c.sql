-- Final hardening: NULL provider guard + provider_name for readability
DROP VIEW IF EXISTS public.provider_health_breakdown CASCADE;

CREATE VIEW public.provider_health_breakdown AS
WITH resolution AS (
  SELECT provider, resolution_pct, course_total AS total_rules, course_resolved AS resolved_rules, course_unmapped AS unresolved_rules FROM public.provider_resolution_drift
),
queue_stats AS (
  SELECT provider_code AS provider, 
    COUNT(*) FILTER (WHERE enrichment_status = 'queued') AS queue_pending, 
    COUNT(*) FILTER (WHERE enrichment_status = 'running') AS queue_running,
    COUNT(*) FILTER (WHERE enrichment_status = 'failed') AS queue_failed, 
    COUNT(*) FILTER (WHERE enrichment_status = 'blocked') AS queue_blocked,
    COUNT(*) FILTER (WHERE enrichment_status = 'succeeded') AS queue_succeeded, 
    COUNT(*) FILTER (WHERE enrichment_status = 'blocked' AND updated_at > now() - interval '24 hours') AS blocked_last_24h
  FROM public.canonical_enrichment_queue GROUP BY provider_code
),
evidence_stats AS (
  SELECT provider_code AS provider, 
    COUNT(*) AS evidence_rows, 
    COUNT(*) FILTER (WHERE validation_passed) AS passed_evidence, 
    MAX(fetched_at) AS last_fetch,
    CASE
      WHEN MAX(fetched_at) IS NULL THEN 'never_run'
      WHEN MAX(fetched_at) < now() - interval '7 days' THEN 'stale'
      ELSE 'active'
    END AS enrichment_activity
  FROM public.canonical_enrichment_evidence GROUP BY provider_code
),
alias_stats AS (
  SELECT provider, aliases_total, complete_evidence, placeholder_evidence, 
    CASE WHEN aliases_total > 0 THEN ROUND(100.0 * complete_evidence / aliases_total, 1) ELSE 100 END AS evidence_pct
  FROM public.alias_evidence_health
),
title_stats AS (
  SELECT provider_code AS provider, 
    COUNT(*) FILTER (WHERE canonical_title IS NULL) AS missing_titles, 
    COUNT(*) FILTER (WHERE canonical_title IS NOT NULL) AS has_titles
  FROM public.source_courses GROUP BY provider_code
),
registry AS (
  SELECT provider_code_norm AS provider, display_name AS provider_name, canonical_url_mode, 
    CASE WHEN canonical_url_mode = 'pattern' THEN 'enrichable' WHEN canonical_url_mode = 'stored' THEN 'stored_urls' ELSE 'manual_only' END AS enrichment_strategy
  FROM public.provider_registry
),
combined AS (
  SELECT
    COALESCE(r.provider, q.provider, e.provider, a.provider, t.provider) AS provider,
    reg.provider_name,
    COALESCE(reg.enrichment_strategy, 'registry_missing') AS enrichment_strategy,
    COALESCE(reg.canonical_url_mode::text, 'registry_missing') AS canonical_url_mode,
    COALESCE(r.resolution_pct, 100) AS resolution_pct, 
    COALESCE(r.total_rules, 0) AS total_rules, 
    COALESCE(r.resolved_rules, 0) AS resolved_rules, 
    COALESCE(r.unresolved_rules, 0) AS unresolved_rules,
    COALESCE(q.queue_pending, 0) AS queue_pending, 
    COALESCE(q.queue_running, 0) AS queue_running, 
    COALESCE(q.queue_failed, 0) AS queue_failed, 
    COALESCE(q.queue_blocked, 0) AS queue_blocked, 
    COALESCE(q.queue_succeeded, 0) AS queue_succeeded, 
    COALESCE(q.blocked_last_24h, 0) AS blocked_last_24h,
    COALESCE(e.evidence_rows, 0) AS evidence_rows, 
    COALESCE(e.passed_evidence, 0) AS passed_evidence, 
    e.last_fetch,
    COALESCE(e.enrichment_activity, 'never_run') AS enrichment_activity,
    COALESCE(a.aliases_total, 0) AS aliases_total, 
    COALESCE(a.complete_evidence, 0) AS complete_evidence, 
    COALESCE(a.placeholder_evidence, 0) AS placeholder_evidence, 
    COALESCE(a.evidence_pct, 100) AS evidence_pct,
    COALESCE(t.missing_titles, 0) AS missing_titles, 
    COALESCE(t.has_titles, 0) AS has_titles,
    CASE WHEN COALESCE(t.has_titles, 0) + COALESCE(t.missing_titles, 0) > 0 
      THEN ROUND(100.0 * COALESCE(t.has_titles, 0) / (COALESCE(t.has_titles, 0) + COALESCE(t.missing_titles, 0)), 1) 
      ELSE 100 
    END AS title_pct,
    CASE 
      WHEN reg.provider IS NULL THEN 'degraded'
      WHEN COALESCE(r.resolution_pct, 100) < 90 OR COALESCE(q.queue_failed, 0) > 10 THEN 'degraded'
      WHEN COALESCE(r.resolution_pct, 100) < 100 OR COALESCE(q.queue_failed, 0) > 0 OR COALESCE(q.blocked_last_24h, 0) > 0 THEN 'warning'
      ELSE 'healthy'
    END AS provider_status,
    reg.provider IS NULL AS registry_missing
  FROM resolution r
  FULL OUTER JOIN queue_stats q ON r.provider = q.provider
  FULL OUTER JOIN evidence_stats e ON COALESCE(r.provider, q.provider) = e.provider
  FULL OUTER JOIN alias_stats a ON COALESCE(r.provider, q.provider, e.provider) = a.provider
  FULL OUTER JOIN title_stats t ON COALESCE(r.provider, q.provider, e.provider, a.provider) = t.provider
  LEFT JOIN registry reg ON COALESCE(r.provider, q.provider, e.provider, a.provider, t.provider) = reg.provider
)
SELECT * FROM combined
WHERE provider IS NOT NULL
ORDER BY
  CASE provider_status WHEN 'degraded' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
  blocked_last_24h DESC,
  queue_failed DESC,
  provider;
-- Single-pane operational dashboard: one row = system health status
CREATE OR REPLACE VIEW public.operational_health_dashboard AS
WITH invariants AS (
  SELECT overall_status FROM public.system_invariant_health LIMIT 1
),
drift AS (
  SELECT 
    COALESCE(MIN(resolution_pct), 100) AS min_resolution_pct,
    COALESCE(AVG(resolution_pct), 100) AS avg_resolution_pct,
    COUNT(*) FILTER (WHERE resolution_pct < 100) AS providers_drifting
  FROM public.provider_resolution_drift
),
gaps AS (
  SELECT COUNT(*) AS registry_gap_count
  FROM public.provider_registry_gaps
),
queue AS (
  SELECT
    COUNT(*) FILTER (WHERE enrichment_status = 'queued') AS queue_pending,
    COUNT(*) FILTER (WHERE enrichment_status = 'running') AS queue_running,
    COUNT(*) FILTER (WHERE enrichment_status = 'failed') AS queue_failed,
    COUNT(*) FILTER (WHERE enrichment_status = 'blocked') AS queue_blocked,
    COUNT(*) FILTER (WHERE enrichment_status = 'succeeded') AS queue_succeeded
  FROM public.canonical_enrichment_queue
),
blocked_24h AS (
  SELECT COUNT(*) AS blocked_last_24h
  FROM public.canonical_enrichment_queue
  WHERE enrichment_status = 'blocked'
    AND updated_at > now() - interval '24 hours'
),
evidence AS (
  SELECT
    COUNT(*) AS total_evidence_rows,
    COUNT(*) FILTER (WHERE validation_passed) AS passed_evidence,
    MAX(fetched_at) AS last_enrichment_at
  FROM public.canonical_enrichment_evidence
),
alias_health AS (
  SELECT
    COALESCE(SUM(placeholder_evidence), 0) AS placeholder_evidence_count,
    COALESCE(AVG(CASE WHEN placeholder_evidence > 0 THEN 0 ELSE 100 END), 100) AS evidence_health_pct
  FROM public.alias_evidence_health
),
titles AS (
  SELECT
    COUNT(*) FILTER (WHERE canonical_title IS NULL) AS missing_titles,
    COUNT(*) FILTER (WHERE canonical_title IS NOT NULL) AS has_titles
  FROM public.source_courses
)
SELECT
  -- Overall status
  i.overall_status AS invariant_status,
  CASE 
    WHEN i.overall_status = 'healthy' 
      AND d.providers_drifting = 0 
      AND g.registry_gap_count = 0 
      AND q.queue_failed < 10
      AND q.queue_blocked < 5
    THEN 'GREEN'
    WHEN i.overall_status != 'healthy' 
      OR d.providers_drifting > 2
      OR g.registry_gap_count > 0
      OR q.queue_failed > 50
    THEN 'RED'
    ELSE 'YELLOW'
  END AS overall_gate,
  
  -- Drift metrics
  ROUND(d.min_resolution_pct::numeric, 1) AS min_resolution_pct,
  ROUND(d.avg_resolution_pct::numeric, 1) AS avg_resolution_pct,
  d.providers_drifting,
  
  -- Registry gaps
  g.registry_gap_count,
  
  -- Queue status
  q.queue_pending,
  q.queue_running,
  q.queue_failed,
  q.queue_blocked,
  q.queue_succeeded,
  b.blocked_last_24h,
  
  -- Evidence health
  e.total_evidence_rows,
  e.passed_evidence,
  e.last_enrichment_at,
  a.placeholder_evidence_count,
  ROUND(a.evidence_health_pct::numeric, 1) AS evidence_health_pct,
  
  -- Title coverage
  t.missing_titles,
  t.has_titles,
  CASE WHEN t.has_titles + t.missing_titles > 0 
    THEN ROUND(100.0 * t.has_titles / (t.has_titles + t.missing_titles), 1)
    ELSE 100
  END AS title_coverage_pct,
  
  -- Timestamp
  now() AS checked_at
FROM invariants i
CROSS JOIN drift d
CROSS JOIN gaps g
CROSS JOIN queue q
CROSS JOIN blocked_24h b
CROSS JOIN evidence e
CROSS JOIN alias_health a
CROSS JOIN titles t;
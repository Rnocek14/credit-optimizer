-- ============================================================================
-- Pipeline Health Views (read-only diagnostics for admin panel)
--
-- Schema asymmetry note (important for future editors):
--   scrape_jobs.institution               (text, NO _code suffix)
--   institution_policy_packs.institution  (text, NO _code suffix)
--   scrape_url_templates.institution_code (text, WITH _code suffix)
--   institution_v1_scope.institution_code (text, WITH _code suffix)
-- Joins must alias explicitly: ON x.institution = y.institution_code.
-- Do NOT use USING(institution_code) across scrape_jobs / policy_packs.
--
-- Timestamp note: scrape_jobs has no completed_at column. The success
-- timestamp is last_attempt_at (set on every attempt; for status='success'
-- rows this is when the success occurred).
-- ============================================================================

-- ---- Q1: Job-level stamp freshness (independent of template column) -------
CREATE OR REPLACE VIEW public.v_pipeline_health_stamped_7d AS
SELECT
  s.institution_code,
  max(j.last_attempt_at)::timestamptz                              AS most_recent_stamp,
  (max(j.last_attempt_at) >= now() - interval '7 days')            AS stamped_within_7d,
  count(*) FILTER (
    WHERE j.status = 'success'
      AND j.last_attempt_at >= now() - interval '7 days'
  )::int                                                           AS successful_scrapes_7d
FROM public.institution_v1_scope s
LEFT JOIN public.scrape_jobs j
  ON j.institution = s.institution_code
 AND j.status = 'success'
GROUP BY s.institution_code;

-- ---- Q1b: Template-column stamp freshness (verifies stamping fix) ---------
CREATE OR REPLACE VIEW public.v_pipeline_health_template_stamp_freshness AS
SELECT
  s.institution_code,
  max(t.last_scraped_at)::timestamptz                              AS most_recent_template_stamp,
  (max(t.last_scraped_at) >= now() - interval '7 days')            AS template_stamped_within_7d,
  count(*) FILTER (WHERE t.status = 'active')::int                 AS templates_active,
  count(*) FILTER (
    WHERE t.status = 'active'
      AND t.last_scraped_at >= now() - interval '7 days'
  )::int                                                           AS templates_stamped_7d
FROM public.institution_v1_scope s
LEFT JOIN public.scrape_url_templates t
  ON t.institution_code = s.institution_code
GROUP BY s.institution_code;

-- ---- Q2: Weekly scrape success ratio --------------------------------------
CREATE OR REPLACE VIEW public.v_pipeline_health_scrape_success_weekly AS
SELECT
  date_trunc('week', j.created_at)::date                           AS week,
  s.institution_code,
  count(*)::int                                                    AS attempts,
  count(*) FILTER (WHERE j.status = 'success')::int                AS successes,
  CASE
    WHEN count(*) > 0
    THEN round(
      (count(*) FILTER (WHERE j.status = 'success'))::numeric / count(*)::numeric,
      4
    )
    ELSE NULL
  END                                                              AS success_ratio
FROM public.institution_v1_scope s
JOIN public.scrape_jobs j
  ON j.institution = s.institution_code
WHERE j.created_at >= now() - interval '12 weeks'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ---- Q3: Monthly funnel (scrape -> pack -> promoted) ----------------------
CREATE OR REPLACE VIEW public.v_pipeline_health_funnel_monthly AS
WITH scrapes AS (
  SELECT
    date_trunc('month', j.last_attempt_at)::date                   AS month,
    s.institution_code,
    count(*) FILTER (WHERE j.status = 'success')::int              AS scrapes_successful
  FROM public.institution_v1_scope s
  JOIN public.scrape_jobs j
    ON j.institution = s.institution_code
  WHERE j.last_attempt_at >= now() - interval '12 months'
  GROUP BY 1, 2
),
packs AS (
  SELECT
    date_trunc('month', p.created_at)::date                        AS month,
    s.institution_code,
    count(DISTINCT p.id)::int                                      AS packs_total,
    count(DISTINCT p.id) FILTER (WHERE p.promoted_at IS NOT NULL)::int AS packs_promoted,
    count(DISTINCT p.id) FILTER (
      WHERE coalesce(array_length(p.merged_from_job_ids, 1), 0) > 0
    )::int                                                         AS packs_via_merge,
    count(DISTINCT p.id) FILTER (
      WHERE coalesce(array_length(p.source_scrape_ids, 1), 0) > 0
    )::int                                                         AS packs_via_validate
  FROM public.institution_v1_scope s
  JOIN public.institution_policy_packs p
    ON p.institution = s.institution_code
  WHERE p.created_at >= now() - interval '12 months'
  GROUP BY 1, 2
)
SELECT
  coalesce(scrapes.month, packs.month)                             AS month,
  coalesce(scrapes.institution_code, packs.institution_code)       AS institution_code,
  coalesce(scrapes.scrapes_successful, 0)                          AS scrapes_successful,
  coalesce(packs.packs_total, 0)                                   AS packs_total,
  coalesce(packs.packs_promoted, 0)                                AS packs_promoted,
  coalesce(packs.packs_via_merge, 0)                               AS packs_via_merge,
  coalesce(packs.packs_via_validate, 0)                            AS packs_via_validate,
  CASE
    WHEN coalesce(scrapes.scrapes_successful, 0) > 0
    THEN round(coalesce(packs.packs_total, 0)::numeric / scrapes.scrapes_successful::numeric, 4)
    ELSE NULL
  END                                                              AS scrape_to_pack_ratio,
  CASE
    WHEN coalesce(packs.packs_total, 0) > 0
    THEN round(coalesce(packs.packs_promoted, 0)::numeric / packs.packs_total::numeric, 4)
    ELSE NULL
  END                                                              AS pack_promotion_ratio
FROM scrapes
FULL OUTER JOIN packs
  ON scrapes.month = packs.month
 AND scrapes.institution_code = packs.institution_code
ORDER BY 1 DESC, 2;

-- ---- Q4a: Template inventory pivoted by status ----------------------------
-- Assumes status enum closed to {active, disabled, changed}. Live values
-- today: active=130, disabled=8. 'changed' kept for future-proofing.
CREATE OR REPLACE VIEW public.v_pipeline_health_template_inventory AS
SELECT
  s.institution_code,
  count(*)::int                                                    AS templates_total,
  count(*) FILTER (WHERE t.status = 'active')::int                 AS templates_active,
  count(*) FILTER (WHERE t.status = 'disabled')::int               AS templates_disabled,
  count(*) FILTER (WHERE t.status = 'changed')::int                AS templates_changed,
  count(*) FILTER (
    WHERE t.status = 'active'
      AND (t.last_scraped_at IS NULL OR t.last_scraped_at < now() - interval '30 days')
  )::int                                                           AS templates_stale_30d
FROM public.institution_v1_scope s
LEFT JOIN public.scrape_url_templates t
  ON t.institution_code = s.institution_code
GROUP BY s.institution_code
ORDER BY s.institution_code;

-- ---- Q4b: Gate-block distribution -----------------------------------------
CREATE OR REPLACE VIEW public.v_pipeline_health_gate_blocks AS
SELECT
  p.institution                                                    AS institution_code,
  p.blocked_reason,
  count(*)::int                                                    AS packs_blocked
FROM public.institution_policy_packs p
JOIN public.institution_v1_scope s
  ON s.institution_code = p.institution
WHERE p.status <> 'deprecated'
  AND p.blocked_reason IS NOT NULL
GROUP BY p.institution, p.blocked_reason
ORDER BY p.institution, packs_blocked DESC;

-- ---- Access control: admin-only ------------------------------------------
REVOKE ALL ON public.v_pipeline_health_stamped_7d                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_template_stamp_freshness    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_scrape_success_weekly       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_funnel_monthly              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_template_inventory          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_gate_blocks                 FROM PUBLIC, anon, authenticated;

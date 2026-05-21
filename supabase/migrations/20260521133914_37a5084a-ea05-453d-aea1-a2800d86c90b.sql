-- ============================================================================
-- Pipeline Health Views — Patch v1
-- Fix: scrape_jobs.status enum is {completed, failed}, not 'success'.
-- Three views (Q1, Q2, Q3.scrapes CTE) filtered on a non-existent value and
-- returned the empty set silently. Replace the magic string with a single
-- helper function so future renames touch one place.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._scrape_job_success_status()
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$ SELECT 'completed'::text $$;

REVOKE ALL ON FUNCTION public._scrape_job_success_status() FROM PUBLIC, anon, authenticated;

-- ---- Q1 (patched) ---------------------------------------------------------
CREATE OR REPLACE VIEW public.v_pipeline_health_stamped_7d AS
SELECT
  s.institution_code,
  max(j.last_attempt_at)::timestamptz                              AS most_recent_stamp,
  (max(j.last_attempt_at) >= now() - interval '7 days')            AS stamped_within_7d,
  count(*) FILTER (
    WHERE j.status = public._scrape_job_success_status()
      AND j.last_attempt_at >= now() - interval '7 days'
  )::int                                                           AS successful_scrapes_7d
FROM public.institution_v1_scope s
LEFT JOIN public.scrape_jobs j
  ON j.institution = s.institution_code
 AND j.status = public._scrape_job_success_status()
GROUP BY s.institution_code;

-- ---- Q2 (patched) ---------------------------------------------------------
CREATE OR REPLACE VIEW public.v_pipeline_health_scrape_success_weekly AS
SELECT
  date_trunc('week', j.created_at)::date                           AS week,
  s.institution_code,
  count(*)::int                                                    AS attempts,
  count(*) FILTER (WHERE j.status = public._scrape_job_success_status())::int  AS successes,
  CASE
    WHEN count(*) > 0
    THEN round(
      (count(*) FILTER (WHERE j.status = public._scrape_job_success_status()))::numeric
        / count(*)::numeric,
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

-- ---- Q3 (patched: scrapes CTE only) ---------------------------------------
CREATE OR REPLACE VIEW public.v_pipeline_health_funnel_monthly AS
WITH scrapes AS (
  SELECT
    date_trunc('month', j.last_attempt_at)::date                   AS month,
    s.institution_code,
    count(*) FILTER (WHERE j.status = public._scrape_job_success_status())::int  AS scrapes_successful
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

-- Re-assert lockdown (CREATE OR REPLACE preserves grants, but be explicit).
REVOKE ALL ON public.v_pipeline_health_stamped_7d            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_scrape_success_weekly FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_pipeline_health_funnel_monthly        FROM PUBLIC, anon, authenticated;
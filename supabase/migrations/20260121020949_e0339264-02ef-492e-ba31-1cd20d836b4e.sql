
-- ============================================================================
-- FINAL CLEANUP: All footgun fixes in one idempotent migration
-- ============================================================================

-- 1) DROP OLD SECURITY FUNCTION (prevents accidental use)
DROP FUNCTION IF EXISTS public.is_service_role();

-- 2) DUPLICATE DETECTION BEFORE UNIQUE CONSTRAINT
DO $$
BEGIN
  IF EXISTS (
    SELECT idempotency_key
    FROM public.canonical_auto_create_log
    WHERE idempotency_key IS NOT NULL
    GROUP BY idempotency_key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add UNIQUE(idempotency_key): duplicates exist';
  END IF;
END $$;

-- 3) FIX VIEW: Use precomputed rule_course_code_norm everywhere
DROP VIEW IF EXISTS public.provider_resolution_drift CASCADE;
DROP VIEW IF EXISTS public.provider_resolution_stats CASCADE;
DROP VIEW IF EXISTS public.provider_registry_gaps CASCADE;
DROP VIEW IF EXISTS public.alias_evidence_health CASCADE;
DROP VIEW IF EXISTS public.enrichment_queue_summary CASCADE;
DROP VIEW IF EXISTS public.transfer_rules_resolved CASCADE;

CREATE OR REPLACE VIEW public.transfer_rules_resolved AS
WITH base AS (
  SELECT 
    r.*,
    upper(btrim(r.source_institution)) AS rule_provider_norm,
    upper(btrim(COALESCE(r.source_course_code, ''))) AS rule_course_code_norm,
    CASE
      WHEN upper(btrim(r.source_institution)) IN ('PORTFOLIO ASSESSMENT', 'REGIONALLY ACCREDITED INSTITUTIONS')
        THEN 'policy'
      ELSE COALESCE(r.rule_scope,
        CASE
          WHEN r.source_course_code IS NULL OR btrim(r.source_course_code) = '' THEN 'policy'
          ELSE 'course'
        END)
    END AS effective_rule_scope
  FROM public.credit_transfer_rules r
)
SELECT 
  b.*,
  COALESCE(sc_direct.id, sc_alias.id, sc_canon.id) AS resolved_source_course_id,
  COALESCE(sc_direct.provider_code, sc_alias.provider_code, sc_canon.provider_code) AS canonical_provider_code,
  COALESCE(sc_direct.canonical_code, sc_alias.canonical_code, sc_canon.canonical_code) AS canonical_code_resolved,
  COALESCE(sc_direct.canonical_title, sc_alias.canonical_title, sc_canon.canonical_title) AS canonical_title_resolved,
  COALESCE(sc_direct.canonical_url, sc_alias.canonical_url, sc_canon.canonical_url) AS canonical_url_resolved,
  CASE
    WHEN b.effective_rule_scope = 'policy' THEN 'policy_rule'
    WHEN sc_direct.id IS NOT NULL THEN 'canonical'
    WHEN sc_alias.id IS NOT NULL THEN 'alias_resolved'
    WHEN sc_canon.id IS NOT NULL THEN 'canonical_match'
    ELSE 'legacy_unmapped'
  END AS canonical_resolution_status,
  CASE
    WHEN COALESCE(sc_direct.id, sc_alias.id, sc_canon.id) IS NULL THEN NULL
    ELSE COALESCE(sc_direct.provider_code, sc_alias.provider_code, sc_canon.provider_code) || ':' || 
         COALESCE(sc_direct.canonical_code, sc_alias.canonical_code, sc_canon.canonical_code)
  END AS source_course_identity,
  CASE
    WHEN sc_direct.id IS NOT NULL THEN 'fk'
    WHEN sc_alias.id IS NOT NULL THEN 'alias'
    WHEN sc_canon.id IS NOT NULL THEN 'canonical_match'
    ELSE NULL
  END AS resolution_method
FROM base b
-- Tier 1: Direct FK resolution
LEFT JOIN public.source_courses sc_direct ON sc_direct.id = b.source_course_id
-- Tier 2: Alias resolution (using precomputed rule_course_code_norm)
LEFT JOIN public.source_course_aliases sca 
  ON sca.provider_code_norm = b.rule_provider_norm
  AND sca.alias_code_norm = b.rule_course_code_norm
LEFT JOIN public.source_courses sc_alias ON sc_alias.id = sca.source_course_id
-- Tier 3: Canonical code direct match (using precomputed rule_course_code_norm)
LEFT JOIN public.source_courses sc_canon
  ON sc_canon.provider_code_norm = b.rule_provider_norm
  AND sc_canon.canonical_code_norm = b.rule_course_code_norm;

-- 4) RECREATE ALL DEPENDENT VIEWS
CREATE OR REPLACE VIEW public.provider_resolution_stats AS
SELECT
  rule_provider_norm as provider,
  count(*) FILTER (WHERE effective_rule_scope <> 'policy') AS course_total,
  count(*) FILTER (WHERE canonical_resolution_status IN ('alias_resolved','canonical','canonical_match')
                   AND effective_rule_scope <> 'policy') AS course_resolved,
  count(*) FILTER (WHERE canonical_resolution_status = 'legacy_unmapped'
                   AND effective_rule_scope <> 'policy') AS course_unmapped,
  count(*) FILTER (WHERE effective_rule_scope = 'policy') AS policy_rules,
  round(
    100.0 * count(*) FILTER (WHERE canonical_resolution_status IN ('alias_resolved','canonical','canonical_match')
                             AND effective_rule_scope <> 'policy')
    / NULLIF(count(*) FILTER (WHERE effective_rule_scope <> 'policy'), 0),
    2
  ) AS resolution_pct
FROM public.transfer_rules_resolved
GROUP BY rule_provider_norm;

CREATE OR REPLACE VIEW public.provider_resolution_drift AS
SELECT
  tr.rule_provider_norm as provider,
  pr.display_name as provider_name,
  count(*) FILTER (WHERE tr.effective_rule_scope <> 'policy') AS course_total,
  count(*) FILTER (WHERE tr.canonical_resolution_status IN ('alias_resolved','canonical','canonical_match')
                   AND tr.effective_rule_scope <> 'policy') AS course_resolved,
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'legacy_unmapped'
                   AND tr.effective_rule_scope <> 'policy') AS course_unmapped,
  count(*) FILTER (WHERE tr.effective_rule_scope = 'policy') AS policy_rules,
  round(
    100.0 * count(*) FILTER (WHERE tr.canonical_resolution_status IN ('alias_resolved','canonical','canonical_match')
                             AND tr.effective_rule_scope <> 'policy')
    / NULLIF(count(*) FILTER (WHERE tr.effective_rule_scope <> 'policy'), 0),
    2
  ) AS resolution_pct,
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'canonical' AND tr.effective_rule_scope <> 'policy') AS resolved_by_fk,
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'alias_resolved' AND tr.effective_rule_scope <> 'policy') AS resolved_by_alias,
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'canonical_match' AND tr.effective_rule_scope <> 'policy') AS resolved_by_canonical_match
FROM public.transfer_rules_resolved tr
LEFT JOIN public.provider_registry pr ON pr.provider_code_norm = tr.rule_provider_norm
GROUP BY tr.rule_provider_norm, pr.display_name;

CREATE OR REPLACE VIEW public.provider_registry_gaps AS
SELECT DISTINCT 
  tr.rule_provider_norm AS provider,
  count(*) AS rule_count
FROM public.transfer_rules_resolved tr
LEFT JOIN public.provider_registry pr
  ON pr.provider_code_norm = tr.rule_provider_norm
WHERE pr.provider_code_norm IS NULL
  AND tr.effective_rule_scope <> 'policy'
GROUP BY tr.rule_provider_norm
ORDER BY rule_count DESC;

CREATE OR REPLACE VIEW public.alias_evidence_health AS
SELECT
  a.provider_code_norm as provider,
  pr.display_name as provider_name,
  count(*) AS aliases_total,
  count(*) FILTER (WHERE pr.provider_code_norm IS NULL) AS registry_missing,
  count(*) FILTER (WHERE a.evidence_url IS NULL OR btrim(a.evidence_url) = '') AS missing_evidence,
  count(*) FILTER (
    WHERE a.evidence_url = COALESCE(pr.root_url, 'https://example.com/')
       OR a.evidence_url = 'https://example.com/'
  ) AS placeholder_evidence,
  count(*) FILTER (
    WHERE a.evidence_url IS NOT NULL
      AND btrim(a.evidence_url) <> ''
      AND a.evidence_url <> 'https://example.com/'
      AND (pr.root_url IS NULL OR a.evidence_url <> pr.root_url)
  ) AS complete_evidence,
  round(
    100.0 * count(*) FILTER (
      WHERE a.evidence_url IS NOT NULL
        AND btrim(a.evidence_url) <> ''
        AND a.evidence_url <> 'https://example.com/'
        AND (pr.root_url IS NULL OR a.evidence_url <> pr.root_url)
    ) / NULLIF(count(*), 0),
    2
  ) AS evidence_complete_pct
FROM public.source_course_aliases a
LEFT JOIN public.provider_registry pr ON pr.provider_code_norm = a.provider_code_norm
GROUP BY a.provider_code_norm, pr.display_name;

CREATE OR REPLACE VIEW public.enrichment_queue_summary AS
SELECT
  provider_code as provider,
  enrichment_status as status,
  count(*) as count,
  avg(attempts) as avg_attempts
FROM public.canonical_enrichment_queue
GROUP BY provider_code, enrichment_status
ORDER BY provider_code, enrichment_status;

-- 5) COMMENTS
COMMENT ON VIEW public.transfer_rules_resolved IS '3-tier resolver: FK → alias → canonical_match. Uses precomputed rule_course_code_norm for deterministic normalization.';
COMMENT ON VIEW public.provider_resolution_stats IS 'Per-provider resolution metrics excluding policy rules';
COMMENT ON VIEW public.provider_resolution_drift IS 'Resolution health with method breakdown (FK/alias/canonical_match)';
COMMENT ON VIEW public.provider_registry_gaps IS 'Providers in rules but missing from registry (excludes policy scope)';
COMMENT ON VIEW public.alias_evidence_health IS 'Evidence completeness per provider with placeholder detection via registry root_url';
COMMENT ON VIEW public.enrichment_queue_summary IS 'Enrichment queue status breakdown by provider';

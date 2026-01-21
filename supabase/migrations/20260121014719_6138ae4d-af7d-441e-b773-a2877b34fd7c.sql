-- Patch transfer_rules_resolved: add canonical direct-match path
-- Priority: 1) source_course_id FK, 2) alias map, 3) canonical code direct-match
-- Eliminates need for "self-alias" rows

DROP VIEW IF EXISTS public.transfer_rules_resolved;

CREATE VIEW public.transfer_rules_resolved AS
WITH base AS (
  SELECT
    r.*,
    upper(btrim(r.source_institution)) AS rule_provider_norm,
    upper(btrim(r.source_course_code)) AS rule_course_code_norm,
    COALESCE(
      r.rule_scope,
      CASE 
        WHEN r.source_course_code IS NULL OR btrim(r.source_course_code) = '' THEN 'policy'
        ELSE 'course'
      END
    ) AS effective_rule_scope
  FROM public.credit_transfer_rules r
)
SELECT
  b.*,

  -- Canonical identity resolution (priority: FK > alias > direct canonical match)
  COALESCE(sc_direct.id, sc_alias.id, sc_canon.id) AS resolved_source_course_id,
  COALESCE(sc_direct.provider_code, sc_alias.provider_code, sc_canon.provider_code) AS canonical_provider_code,
  COALESCE(sc_direct.canonical_code, sc_alias.canonical_code, sc_canon.canonical_code) AS canonical_code_resolved,
  COALESCE(sc_direct.canonical_title, sc_alias.canonical_title, sc_canon.canonical_title) AS canonical_title_resolved,
  COALESCE(sc_direct.canonical_url, sc_alias.canonical_url, sc_canon.canonical_url) AS canonical_url_resolved,

  -- Resolution status
  CASE
    WHEN b.effective_rule_scope = 'policy' THEN 'policy_rule'
    WHEN sc_direct.id IS NOT NULL THEN 'canonical'
    WHEN sc_alias.id IS NOT NULL THEN 'alias_resolved'
    WHEN sc_canon.id IS NOT NULL THEN 'canonical_match'
    ELSE 'legacy_unmapped'
  END AS canonical_resolution_status,

  CASE
    WHEN COALESCE(sc_direct.id, sc_alias.id, sc_canon.id) IS NULL THEN NULL
    ELSE (
      COALESCE(sc_direct.provider_code, sc_alias.provider_code, sc_canon.provider_code) 
      || ':' || 
      COALESCE(sc_direct.canonical_code, sc_alias.canonical_code, sc_canon.canonical_code)
    )
  END AS source_course_identity,

  -- Rule granularity classification
  CASE
    WHEN b.source_course_code IS NOT NULL AND b.target_course_code IS NOT NULL THEN 'course_map'
    WHEN b.source_course_code IS NULL AND b.target_course_code IS NULL THEN 'policy'
    ELSE 'incomplete'
  END AS rule_granularity,

  -- Evidence presence flag
  CASE
    WHEN b.evidence_url IS NOT NULL AND btrim(b.evidence_url) <> '' THEN 'link'
    ELSE 'none'
  END AS evidence_presence

FROM base b

-- Priority 1: Direct FK to source_courses
LEFT JOIN public.source_courses sc_direct
  ON sc_direct.id = b.source_course_id

-- Priority 2: Alias mapping
LEFT JOIN public.source_course_aliases a
  ON a.provider_code_norm = b.rule_provider_norm
 AND a.alias_code_norm = b.rule_course_code_norm

LEFT JOIN public.source_courses sc_alias
  ON sc_alias.id = a.source_course_id

-- Priority 3: Direct canonical code match (eliminates need for self-aliases)
LEFT JOIN public.source_courses sc_canon
  ON sc_canon.provider_code_norm = b.rule_provider_norm
 AND sc_canon.canonical_code_norm = b.rule_course_code_norm
 AND sc_direct.id IS NULL  -- Only if FK didn't match
 AND a.id IS NULL;         -- Only if alias didn't match

COMMENT ON VIEW public.transfer_rules_resolved IS
'Resolves transfer rules to canonical identity via: 1) direct FK, 2) alias map, 3) canonical code match. Policy rules excluded from course resolution %.';
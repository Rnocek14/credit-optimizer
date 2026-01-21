-- Add rule_scope column and recreate view with policy rule classification
-- Step 1: Add column
ALTER TABLE public.credit_transfer_rules
  ADD COLUMN IF NOT EXISTS rule_scope text;

-- Step 2: Backfill based on source_course_code presence
UPDATE public.credit_transfer_rules
SET rule_scope = CASE
  WHEN source_course_code IS NULL OR btrim(source_course_code) = '' THEN 'policy'
  ELSE 'course'
END
WHERE rule_scope IS NULL;

COMMENT ON COLUMN public.credit_transfer_rules.rule_scope IS
'Rule granularity: course (specific course mapping) or policy (institution-level acceptance). Policy rules excluded from course-level resolution %.';

-- Step 3: Recreate view (must drop first to change column structure)
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
  COALESCE(sc_direct.id, sc_alias.id) AS resolved_source_course_id,
  COALESCE(sc_direct.provider_code, sc_alias.provider_code) AS canonical_provider_code,
  COALESCE(sc_direct.canonical_code, sc_alias.canonical_code) AS canonical_code_resolved,
  COALESCE(sc_direct.canonical_title, sc_alias.canonical_title) AS canonical_title_resolved,
  COALESCE(sc_direct.canonical_url, sc_alias.canonical_url) AS canonical_url_resolved,
  CASE
    WHEN b.effective_rule_scope = 'policy' THEN 'policy_rule'
    WHEN sc_direct.id IS NOT NULL THEN 'canonical'
    WHEN sc_alias.id IS NOT NULL THEN 'alias_resolved'
    ELSE 'legacy_unmapped'
  END AS canonical_resolution_status,
  CASE
    WHEN COALESCE(sc_direct.id, sc_alias.id) IS NULL THEN NULL
    ELSE (COALESCE(sc_direct.provider_code, sc_alias.provider_code) || ':' || COALESCE(sc_direct.canonical_code, sc_alias.canonical_code))
  END AS source_course_identity,
  CASE
    WHEN b.source_course_code IS NOT NULL AND b.target_course_code IS NOT NULL THEN 'course_map'
    WHEN b.source_course_code IS NULL AND b.target_course_code IS NULL THEN 'policy'
    ELSE 'incomplete'
  END AS rule_granularity,
  CASE
    WHEN b.evidence_url IS NOT NULL AND btrim(b.evidence_url) <> '' THEN 'link'
    ELSE 'none'
  END AS evidence_presence
FROM base b
LEFT JOIN public.source_courses sc_direct
  ON sc_direct.id = b.source_course_id
LEFT JOIN public.source_course_aliases a
  ON a.provider_code_norm = b.rule_provider_norm
 AND a.alias_code_norm = b.rule_course_code_norm
LEFT JOIN public.source_courses sc_alias
  ON sc_alias.id = a.source_course_id;

COMMENT ON VIEW public.transfer_rules_resolved IS
'Resolves transfer rules to canonical source course identity. Policy rules (no source_course_code) get status policy_rule and are excluded from course resolution %.';
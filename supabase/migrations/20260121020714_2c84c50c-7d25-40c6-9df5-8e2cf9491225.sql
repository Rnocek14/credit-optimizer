
-- ============================================================================
-- FIX: Security hole, idempotency safety, pseudo-provider reclassification
-- ============================================================================

-- 1) FIX SECURITY HOLE: Strict admin check (no "missing JWT = privileged")
DROP FUNCTION IF EXISTS public.is_service_role();

CREATE OR REPLACE FUNCTION public.is_service_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('service_role', 'admin'),
    false
  );
$$;

-- 2) ENSURE IDEMPOTENCY CONSTRAINT EXISTS SAFELY
ALTER TABLE public.canonical_auto_create_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.canonical_auto_create_log l
SET idempotency_key = l.provider_code || ':' || l.canonical_code || ':auto_create_v1:' || l.id::text
WHERE l.idempotency_key IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'canonical_auto_create_log_idempotency_key_uniq'
  ) THEN
    ALTER TABLE public.canonical_auto_create_log
      ADD CONSTRAINT canonical_auto_create_log_idempotency_key_uniq UNIQUE (idempotency_key);
  END IF;
END $$;

-- 3) UPDATE ENSURE_CANONICALS TO USE NEW ADMIN CHECK
CREATE OR REPLACE FUNCTION public.ensure_canonicals_for_unmapped_rules(
  p_provider_filter TEXT DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  provider_code TEXT,
  canonical_code TEXT,
  action TEXT,
  rule_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_service_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: requires service_role or admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH unmapped_codes AS (
    SELECT 
      tr.rule_provider_norm as provider,
      tr.source_course_code as code,
      count(*) as rules
    FROM public.transfer_rules_resolved tr
    WHERE tr.effective_rule_scope <> 'policy'
      AND tr.canonical_resolution_status = 'legacy_unmapped'
      AND (p_provider_filter IS NULL OR tr.rule_provider_norm = upper(p_provider_filter))
    GROUP BY tr.rule_provider_norm, tr.source_course_code
  ),
  provider_urls AS (
    SELECT provider_code_norm, root_url FROM public.provider_registry
  ),
  inserted_canonicals AS (
    INSERT INTO public.source_courses (provider_code, canonical_code, canonical_title, canonical_url)
    SELECT 
      u.provider,
      u.code,
      NULL,
      COALESCE(pu.root_url, 'https://example.com/')
    FROM unmapped_codes u
    LEFT JOIN provider_urls pu ON pu.provider_code_norm = u.provider
    WHERE NOT p_dry_run
    ON CONFLICT (provider_code_norm, canonical_code_norm) DO NOTHING
    RETURNING id, source_courses.provider_code, source_courses.canonical_code
  ),
  logged AS (
    INSERT INTO public.canonical_auto_create_log (source_course_id, provider_code, canonical_code, creation_reason, rule_count, idempotency_key)
    SELECT 
      ic.id,
      ic.provider_code,
      ic.canonical_code,
      'Auto-created from unmapped transfer rules',
      (SELECT rules FROM unmapped_codes u WHERE u.provider = ic.provider_code AND u.code = ic.canonical_code),
      ic.provider_code || ':' || ic.canonical_code || ':auto_create_v1:' || ic.id::text
    FROM inserted_canonicals ic
    WHERE NOT p_dry_run
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING source_course_id, canonical_auto_create_log.provider_code, canonical_auto_create_log.canonical_code
  ),
  queued AS (
    INSERT INTO public.canonical_enrichment_queue (source_course_id, provider_code, canonical_code, missing_fields, priority)
    SELECT 
      l.source_course_id,
      l.provider_code,
      l.canonical_code,
      ARRAY['canonical_title'],
      75
    FROM logged l
    WHERE NOT p_dry_run
    ON CONFLICT (source_course_id) DO NOTHING
    RETURNING canonical_enrichment_queue.provider_code
  )
  SELECT 
    u.provider,
    u.code,
    CASE 
      WHEN p_dry_run THEN 'would_create'
      WHEN EXISTS (SELECT 1 FROM inserted_canonicals ic WHERE ic.provider_code = u.provider AND ic.canonical_code = u.code) THEN 'created'
      ELSE 'already_exists'
    END,
    u.rules
  FROM unmapped_codes u;
END;
$$;

-- 4) RECLASSIFY PSEUDO-PROVIDERS: Update view to treat them as policy scope
DROP VIEW IF EXISTS public.provider_resolution_drift CASCADE;
DROP VIEW IF EXISTS public.provider_resolution_stats CASCADE;
DROP VIEW IF EXISTS public.provider_registry_gaps CASCADE;
DROP VIEW IF EXISTS public.transfer_rules_resolved CASCADE;

-- Recreate with pseudo-provider handling in effective_rule_scope
CREATE OR REPLACE VIEW public.transfer_rules_resolved AS
WITH base AS (
  SELECT 
    r.*,
    upper(btrim(r.source_institution)) AS rule_provider_norm,
    upper(btrim(r.source_course_code)) AS rule_course_code_norm,
    -- Reclassify pseudo-providers as policy scope
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
-- Tier 2: Alias resolution
LEFT JOIN public.source_course_aliases sca 
  ON sca.provider_code_norm = b.rule_provider_norm
  AND sca.alias_code_norm = upper(btrim(b.source_course_code))
LEFT JOIN public.source_courses sc_alias ON sc_alias.id = sca.source_course_id
-- Tier 3: Canonical code direct match
LEFT JOIN public.source_courses sc_canon
  ON sc_canon.provider_code_norm = b.rule_provider_norm
  AND sc_canon.canonical_code_norm = upper(btrim(b.source_course_code));

-- 5) RECREATE DEPENDENT VIEWS
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

-- Registry gaps now excludes policy-scope rules
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

COMMENT ON FUNCTION public.is_service_or_admin IS 'Strict admin check - only true if JWT role is service_role or admin (missing JWT = false)';

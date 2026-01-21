
-- ============================================================================
-- FIX: Idempotency collision, evidence health NULL handling, admin gate, registry gaps
-- ============================================================================

-- 1) FIX IDEMPOTENCY KEY: Collision-proof with row id suffix
-- First drop the constraint if it exists (may have failed partially)
ALTER TABLE public.canonical_auto_create_log 
  DROP CONSTRAINT IF EXISTS canonical_auto_create_log_idempotency_key_key;

-- Backfill with row id suffix to guarantee uniqueness
UPDATE public.canonical_auto_create_log l
SET idempotency_key = l.provider_code || ':' || l.canonical_code || ':auto_create_v1:' || l.id::text
WHERE idempotency_key IS NULL OR idempotency_key NOT LIKE '%:auto_create_v1:%';

-- Now add the unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'canonical_auto_create_log_idempotency_key_uniq'
  ) THEN
    ALTER TABLE public.canonical_auto_create_log
      ADD CONSTRAINT canonical_auto_create_log_idempotency_key_uniq UNIQUE (idempotency_key);
  END IF;
END $$;

-- 2) FIX ALIAS_EVIDENCE_HEALTH: Handle NULL root_url + add registry_missing metric
DROP VIEW IF EXISTS public.alias_evidence_health;

CREATE VIEW public.alias_evidence_health AS
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

-- 3) ADD PROVIDER_REGISTRY_GAPS VIEW: Detect providers missing from registry
CREATE OR REPLACE VIEW public.provider_registry_gaps AS
SELECT DISTINCT 
  tr.rule_provider_norm AS provider,
  count(*) AS rule_count
FROM public.transfer_rules_resolved tr
LEFT JOIN public.provider_registry pr
  ON pr.provider_code_norm = tr.rule_provider_norm
WHERE pr.provider_code_norm IS NULL
GROUP BY tr.rule_provider_norm
ORDER BY rule_count DESC;

-- 4) ADD ADMIN CHECK HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Returns true if called from service_role (backend/edge functions)
  -- or if JWT role claim is 'service_role' or 'admin'
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('service_role', 'admin'),
    -- Fallback: check if we're in a service context (no JWT = backend call)
    current_setting('request.jwt.claims', true) IS NULL
  );
$$;

-- 5) UPDATE ENSURE_CANONICALS WITH ADMIN GATE
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
  -- ADMIN GATE: Only service_role or admin can execute
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Permission denied: requires service_role or admin'
      USING ERRCODE = '42501'; -- insufficient_privilege
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

-- 6) ADD ENRICHMENT STRATEGY COLUMNS TO REGISTRY (future-proofing)
ALTER TABLE public.provider_registry
  ADD COLUMN IF NOT EXISTS canonical_url_mode TEXT DEFAULT 'root_only' 
    CHECK (canonical_url_mode IN ('root_only', 'pattern', 'stored')),
  ADD COLUMN IF NOT EXISTS canonical_url_pattern TEXT;

-- Add comments
COMMENT ON VIEW public.provider_registry_gaps IS 'Providers in rules but missing from registry - compliance gap';
COMMENT ON FUNCTION public.is_service_role IS 'Check if caller has service_role or admin privileges';
COMMENT ON COLUMN public.provider_registry.canonical_url_mode IS 'How to generate canonical URLs: root_only (use root), pattern (template), stored (lookup)';
COMMENT ON COLUMN public.provider_registry.canonical_url_pattern IS 'URL pattern template e.g. https://study.com/academy/course/{code}.html';

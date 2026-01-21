
-- ============================================================================
-- PROVIDER REGISTRY: Single source of truth for all provider metadata
-- ============================================================================

-- 1) PROVIDER REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.provider_registry (
  provider_code_norm TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  root_url TEXT NOT NULL,
  enrichment_strategy TEXT NOT NULL DEFAULT 'manual' CHECK (enrichment_strategy IN ('scraper', 'api', 'manual', 'none')),
  is_alt_credit_provider BOOLEAN NOT NULL DEFAULT TRUE,
  is_institution BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed known providers
INSERT INTO public.provider_registry (provider_code_norm, display_name, root_url, enrichment_strategy, is_alt_credit_provider, is_institution) VALUES
  ('SOPHIA', 'Sophia Learning', 'https://sophia.org/', 'scraper', TRUE, FALSE),
  ('STUDYCOM', 'Study.com', 'https://study.com/', 'scraper', TRUE, FALSE),
  ('STRAIGHTERLINE', 'StraighterLine', 'https://straighterline.com/', 'scraper', TRUE, FALSE),
  ('CLEP', 'CLEP Exams', 'https://clep.collegeboard.org/', 'manual', TRUE, FALSE),
  ('DSST', 'DSST Exams', 'https://www.prometric.com/dsst', 'manual', TRUE, FALSE),
  ('AP', 'AP Exams', 'https://apstudents.collegeboard.org/', 'manual', TRUE, FALSE),
  ('TESU', 'Thomas Edison State University', 'https://www.tesu.edu/', 'manual', FALSE, TRUE),
  ('COSC', 'Charter Oak State College', 'https://www.charteroak.edu/', 'manual', FALSE, TRUE),
  ('WGU', 'Western Governors University', 'https://www.wgu.edu/', 'manual', FALSE, TRUE),
  ('TECEP', 'TECEP Exams', 'https://www.tesu.edu/tecep', 'manual', TRUE, FALSE),
  ('ACE', 'ACE Credit', 'https://www.acenet.edu/', 'manual', TRUE, FALSE),
  ('NCCRS', 'NCCRS', 'https://www.nationalccrs.org/', 'manual', TRUE, FALSE)
ON CONFLICT (provider_code_norm) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  root_url = EXCLUDED.root_url,
  enrichment_strategy = EXCLUDED.enrichment_strategy,
  updated_at = now();

-- Enable RLS
ALTER TABLE public.provider_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to provider registry"
  ON public.provider_registry FOR SELECT TO public USING (true);

-- 2) FIX DRIFT VIEW: Use actual resolution statuses from resolver
DROP VIEW IF EXISTS public.provider_resolution_drift;

CREATE VIEW public.provider_resolution_drift AS
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
  -- Method breakdown (matches actual resolver output)
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'canonical' AND tr.effective_rule_scope <> 'policy') AS resolved_by_fk,
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'alias_resolved' AND tr.effective_rule_scope <> 'policy') AS resolved_by_alias,
  count(*) FILTER (WHERE tr.canonical_resolution_status = 'canonical_match' AND tr.effective_rule_scope <> 'policy') AS resolved_by_canonical_match
FROM public.transfer_rules_resolved tr
LEFT JOIN public.provider_registry pr ON pr.provider_code_norm = tr.rule_provider_norm
GROUP BY tr.rule_provider_norm, pr.display_name;

-- 3) FIX EVIDENCE HEALTH VIEW: Use provider_registry for placeholder detection
DROP VIEW IF EXISTS public.alias_evidence_health;

CREATE VIEW public.alias_evidence_health AS
SELECT
  a.provider_code_norm as provider,
  pr.display_name as provider_name,
  count(*) AS aliases_total,
  count(*) FILTER (WHERE a.evidence_url IS NULL OR btrim(a.evidence_url) = '') AS missing_evidence,
  count(*) FILTER (WHERE a.evidence_url = pr.root_url OR a.evidence_url = 'https://example.com/') AS placeholder_evidence,
  count(*) FILTER (WHERE a.evidence_url IS NOT NULL 
                   AND a.evidence_url <> pr.root_url 
                   AND a.evidence_url <> 'https://example.com/'
                   AND btrim(a.evidence_url) <> '') AS complete_evidence,
  round(
    100.0 * count(*) FILTER (WHERE a.evidence_url IS NOT NULL 
                             AND a.evidence_url <> pr.root_url 
                             AND a.evidence_url <> 'https://example.com/'
                             AND btrim(a.evidence_url) <> '')
    / NULLIF(count(*), 0),
    2
  ) AS evidence_complete_pct
FROM public.source_course_aliases a
LEFT JOIN public.provider_registry pr ON pr.provider_code_norm = a.provider_code_norm
GROUP BY a.provider_code_norm, pr.display_name;

-- 4) UPDATE ENSURE_CANONICALS FUNCTION: Use provider_registry for URLs
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
  -- Get provider URLs from registry
  provider_urls AS (
    SELECT provider_code_norm, root_url FROM public.provider_registry
  ),
  -- Insert missing canonicals (if not dry run)
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
  -- Log auto-created canonicals
  logged AS (
    INSERT INTO public.canonical_auto_create_log (source_course_id, provider_code, canonical_code, creation_reason, rule_count)
    SELECT 
      ic.id,
      ic.provider_code,
      ic.canonical_code,
      'Auto-created from unmapped transfer rules',
      (SELECT rules FROM unmapped_codes u WHERE u.provider = ic.provider_code AND u.code = ic.canonical_code)
    FROM inserted_canonicals ic
    WHERE NOT p_dry_run
    RETURNING source_course_id, canonical_auto_create_log.provider_code, canonical_auto_create_log.canonical_code
  ),
  -- Queue for enrichment
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

-- 5) ADD IDEMPOTENCY KEY TO AUTO-CREATE LOG
ALTER TABLE public.canonical_auto_create_log 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Backfill existing rows
UPDATE public.canonical_auto_create_log 
SET idempotency_key = provider_code || ':' || canonical_code || ':auto_create_v1'
WHERE idempotency_key IS NULL;

-- Add comments
COMMENT ON TABLE public.provider_registry IS 'Single source of truth for provider metadata, URLs, and enrichment strategies';
COMMENT ON VIEW public.provider_resolution_drift IS 'Monitor resolution health per provider - uses actual resolver status values';
COMMENT ON VIEW public.alias_evidence_health IS 'Track evidence completeness - uses provider_registry for placeholder detection';

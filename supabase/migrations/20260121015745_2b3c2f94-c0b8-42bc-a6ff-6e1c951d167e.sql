
-- ============================================================================
-- AUTOMATION INFRASTRUCTURE: Self-healing canonical resolution pipeline
-- ============================================================================

-- 1) CANONICAL ENRICHMENT QUEUE: Track canonicals needing title/url enrichment
CREATE TABLE IF NOT EXISTS public.canonical_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_course_id UUID NOT NULL REFERENCES public.source_courses(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  canonical_code TEXT NOT NULL,
  enrichment_status TEXT NOT NULL DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 50,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_course_id)
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status ON public.canonical_enrichment_queue(enrichment_status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_provider ON public.canonical_enrichment_queue(provider_code);

-- Enable RLS
ALTER TABLE public.canonical_enrichment_queue ENABLE ROW LEVEL SECURITY;

-- Public read access (admin write would be separate)
CREATE POLICY "Allow public read access to enrichment queue"
  ON public.canonical_enrichment_queue FOR SELECT TO public USING (true);

-- 2) CANONICAL AUTO-CREATE LOG: Audit trail for automated canonical creation
CREATE TABLE IF NOT EXISTS public.canonical_auto_create_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_course_id UUID REFERENCES public.source_courses(id) ON DELETE SET NULL,
  provider_code TEXT NOT NULL,
  canonical_code TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  creation_reason TEXT,
  rule_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_create_log_provider ON public.canonical_auto_create_log(provider_code);
CREATE INDEX IF NOT EXISTS idx_auto_create_log_created ON public.canonical_auto_create_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.canonical_auto_create_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to auto-create log"
  ON public.canonical_auto_create_log FOR SELECT TO public USING (true);

-- 3) ENSURE CANONICALS FUNCTION: Idempotent auto-creation of missing canonicals
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
DECLARE
  v_inserted_count INTEGER := 0;
  v_queued_count INTEGER := 0;
BEGIN
  -- Find unmapped course-level rules and create missing canonicals
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
  -- Insert missing canonicals (if not dry run)
  inserted_canonicals AS (
    INSERT INTO public.source_courses (provider_code, canonical_code, canonical_title, canonical_url)
    SELECT 
      u.provider,
      u.code,
      NULL, -- Title to be enriched later
      CASE 
        WHEN u.provider = 'SOPHIA' THEN 'https://sophia.org/'
        WHEN u.provider = 'STUDYCOM' THEN 'https://study.com/'
        WHEN u.provider = 'STRAIGHTERLINE' THEN 'https://straighterline.com/'
        WHEN u.provider = 'CLEP' THEN 'https://clep.collegeboard.org/'
        WHEN u.provider = 'TESU' THEN 'https://www.tesu.edu/'
        WHEN u.provider = 'COSC' THEN 'https://www.charteroak.edu/'
        WHEN u.provider = 'WGU' THEN 'https://www.wgu.edu/'
        ELSE 'https://example.com/'
      END
    FROM unmapped_codes u
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
  -- Queue for enrichment (missing title)
  queued AS (
    INSERT INTO public.canonical_enrichment_queue (source_course_id, provider_code, canonical_code, missing_fields, priority)
    SELECT 
      l.source_course_id,
      l.provider_code,
      l.canonical_code,
      ARRAY['canonical_title'],
      75 -- Higher priority for newly created
    FROM logged l
    WHERE NOT p_dry_run
    ON CONFLICT (source_course_id) DO NOTHING
    RETURNING canonical_enrichment_queue.provider_code, canonical_enrichment_queue.canonical_code
  )
  -- Return results
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

-- 4) RESOLUTION DRIFT VIEW: Monitor resolution health per provider
CREATE OR REPLACE VIEW public.provider_resolution_drift AS
SELECT
  rule_provider_norm as provider,
  count(*) FILTER (WHERE effective_rule_scope <> 'policy') AS course_total,
  count(*) FILTER (WHERE canonical_resolution_status IN ('alias_resolved','canonical','canonical_match','fk_resolved')
                   AND effective_rule_scope <> 'policy') AS course_resolved,
  count(*) FILTER (WHERE canonical_resolution_status = 'legacy_unmapped'
                   AND effective_rule_scope <> 'policy') AS course_unmapped,
  count(*) FILTER (WHERE effective_rule_scope = 'policy') AS policy_rules,
  round(
    100.0 * count(*) FILTER (WHERE canonical_resolution_status IN ('alias_resolved','canonical','canonical_match','fk_resolved')
                             AND effective_rule_scope <> 'policy')
    / NULLIF(count(*) FILTER (WHERE effective_rule_scope <> 'policy'), 0),
    2
  ) AS resolution_pct,
  -- Resolution method breakdown
  count(*) FILTER (WHERE canonical_resolution_status = 'fk_resolved' AND effective_rule_scope <> 'policy') AS resolved_by_fk,
  count(*) FILTER (WHERE canonical_resolution_status = 'alias_resolved' AND effective_rule_scope <> 'policy') AS resolved_by_alias,
  count(*) FILTER (WHERE canonical_resolution_status = 'canonical_match' AND effective_rule_scope <> 'policy') AS resolved_by_canonical_match
FROM public.transfer_rules_resolved
GROUP BY rule_provider_norm;

-- 5) EVIDENCE HEALTH VIEW: Track placeholder/missing evidence
CREATE OR REPLACE VIEW public.alias_evidence_health AS
SELECT
  provider_code_norm as provider,
  count(*) AS aliases_total,
  count(*) FILTER (WHERE evidence_url IS NULL OR btrim(evidence_url) = '') AS missing_evidence,
  count(*) FILTER (WHERE evidence_url IN ('https://study.com/', 'https://sophia.org/', 'https://straighterline.com/', 'https://example.com/')) AS placeholder_evidence,
  count(*) FILTER (WHERE evidence_url IS NOT NULL AND evidence_url NOT IN ('https://study.com/', 'https://sophia.org/', 'https://straighterline.com/', 'https://example.com/') AND btrim(evidence_url) <> '') AS complete_evidence,
  round(
    100.0 * count(*) FILTER (WHERE evidence_url IS NOT NULL AND evidence_url NOT IN ('https://study.com/', 'https://sophia.org/', 'https://straighterline.com/', 'https://example.com/') AND btrim(evidence_url) <> '')
    / NULLIF(count(*), 0),
    2
  ) AS evidence_complete_pct
FROM public.source_course_aliases
GROUP BY provider_code_norm;

-- 6) ENRICHMENT QUEUE SUMMARY VIEW
CREATE OR REPLACE VIEW public.enrichment_queue_summary AS
SELECT
  provider_code as provider,
  enrichment_status as status,
  count(*) as count,
  avg(attempts) as avg_attempts
FROM public.canonical_enrichment_queue
GROUP BY provider_code, enrichment_status
ORDER BY provider_code, enrichment_status;

-- Add comments
COMMENT ON TABLE public.canonical_enrichment_queue IS 'Queue for canonicals needing title/URL enrichment';
COMMENT ON TABLE public.canonical_auto_create_log IS 'Audit trail for automated canonical creation';
COMMENT ON FUNCTION public.ensure_canonicals_for_unmapped_rules IS 'Idempotent function to auto-create missing canonicals from unmapped transfer rules';
COMMENT ON VIEW public.provider_resolution_drift IS 'Monitor resolution health and method breakdown per provider';
COMMENT ON VIEW public.alias_evidence_health IS 'Track placeholder/missing evidence in aliases';

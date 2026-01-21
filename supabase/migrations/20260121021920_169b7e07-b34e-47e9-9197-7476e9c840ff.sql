
-- ============================================================================
-- ENRICHMENT WORKER INFRASTRUCTURE: Evidence storage + worker support
-- ============================================================================

-- 1) ADD MISSING COLUMNS TO QUEUE
ALTER TABLE public.canonical_enrichment_queue
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_error_code TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Update status check constraint to include all states
ALTER TABLE public.canonical_enrichment_queue 
  DROP CONSTRAINT IF EXISTS canonical_enrichment_queue_enrichment_status_check;

ALTER TABLE public.canonical_enrichment_queue
  ADD CONSTRAINT canonical_enrichment_queue_enrichment_status_check 
  CHECK (enrichment_status IN ('pending', 'queued', 'running', 'succeeded', 'failed', 'blocked', 'in_progress', 'completed', 'skipped'));

-- Add worker claim index
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_claim 
  ON public.canonical_enrichment_queue(enrichment_status, next_attempt_at, priority DESC)
  WHERE enrichment_status IN ('pending', 'queued');

-- 2) ADD ALLOWED_DOMAINS TO PROVIDER_REGISTRY
ALTER TABLE public.provider_registry
  ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS title_min_length INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS forbidden_title_patterns TEXT[] DEFAULT ARRAY['404', 'not found', 'access denied', 'sign in', 'captcha', 'error'];

-- Seed allowed domains for known providers
UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['sophia.org', 'www.sophia.org'],
  canonical_url_mode = 'pattern',
  canonical_url_pattern = 'https://www.sophia.org/tutorials/{code}'
WHERE provider_code_norm = 'SOPHIA';

UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['study.com', 'www.study.com'],
  canonical_url_mode = 'pattern',
  canonical_url_pattern = 'https://study.com/academy/course/{code}.html'
WHERE provider_code_norm = 'STUDYCOM';

UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['straighterline.com', 'www.straighterline.com'],
  canonical_url_mode = 'pattern',
  canonical_url_pattern = 'https://www.straighterline.com/online-college-courses/{code}'
WHERE provider_code_norm = 'STRAIGHTERLINE';

UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['clep.collegeboard.org'],
  canonical_url_mode = 'root_only'
WHERE provider_code_norm = 'CLEP';

UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['tesu.edu', 'www.tesu.edu']
WHERE provider_code_norm = 'TESU';

UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['charteroak.edu', 'www.charteroak.edu']
WHERE provider_code_norm = 'COSC';

UPDATE public.provider_registry SET 
  allowed_domains = ARRAY['wgu.edu', 'www.wgu.edu']
WHERE provider_code_norm = 'WGU';

-- 3) CREATE ENRICHMENT EVIDENCE TABLE (append-only audit trail)
CREATE TABLE IF NOT EXISTS public.canonical_enrichment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.canonical_enrichment_queue(id) ON DELETE SET NULL,
  source_course_id UUID NOT NULL,
  provider_code TEXT NOT NULL,
  canonical_code TEXT NOT NULL,
  
  -- Fetch metadata
  fetch_url TEXT NOT NULL,
  final_url TEXT,
  http_status INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Content snapshot
  content_sha256 TEXT,
  raw_text TEXT,
  content_length INTEGER,
  
  -- Extraction results
  extractor_version TEXT NOT NULL DEFAULT 'v1',
  parse_result JSONB DEFAULT '{}',
  
  -- Validation
  validation JSONB DEFAULT '{}',
  validation_passed BOOLEAN DEFAULT FALSE,
  
  -- What was written (if any)
  field_written TEXT,
  value_written TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for evidence lookup
CREATE INDEX IF NOT EXISTS idx_enrichment_evidence_source 
  ON public.canonical_enrichment_evidence(source_course_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_evidence_provider 
  ON public.canonical_enrichment_evidence(provider_code, canonical_code);

-- Enable RLS
ALTER TABLE public.canonical_enrichment_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to enrichment evidence"
  ON public.canonical_enrichment_evidence FOR SELECT TO public USING (true);

-- 4) MONITORING VIEWS

-- Stuck queue items
CREATE OR REPLACE VIEW public.enrichment_stuck AS
SELECT 
  id,
  provider_code,
  canonical_code,
  enrichment_status,
  attempts,
  last_error_code,
  last_attempt_at,
  next_attempt_at,
  created_at
FROM public.canonical_enrichment_queue
WHERE (enrichment_status IN ('running', 'pending', 'queued')
       AND (attempts >= 5 OR next_attempt_at < now() - interval '24 hours'))
   OR (enrichment_status = 'running' AND locked_at < now() - interval '1 hour');

-- Evidence freshness per provider
CREATE OR REPLACE VIEW public.enrichment_evidence_freshness AS
SELECT
  provider_code,
  count(*) AS evidence_rows,
  count(*) FILTER (WHERE validation_passed) AS validated_rows,
  count(*) FILTER (WHERE field_written IS NOT NULL) AS writes_made,
  max(fetched_at) AS last_fetch,
  min(fetched_at) AS first_fetch
FROM public.canonical_enrichment_evidence
GROUP BY provider_code;

-- 5) WORKER CLAIM FUNCTION (atomic job acquisition)
CREATE OR REPLACE FUNCTION public.claim_enrichment_jobs(
  p_batch_size INTEGER DEFAULT 10,
  p_worker_id TEXT DEFAULT 'default'
)
RETURNS TABLE(
  queue_id UUID,
  source_course_id UUID,
  provider_code TEXT,
  canonical_code TEXT,
  missing_fields TEXT[],
  attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin gate
  IF NOT public.is_service_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: requires service_role or admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    UPDATE public.canonical_enrichment_queue q
    SET 
      enrichment_status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
    WHERE q.id IN (
      SELECT q2.id
      FROM public.canonical_enrichment_queue q2
      WHERE q2.enrichment_status IN ('pending', 'queued')
        AND q2.next_attempt_at <= now()
      ORDER BY q2.priority DESC, q2.created_at ASC
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    RETURNING q.id, q.source_course_id, q.provider_code, q.canonical_code, q.missing_fields, q.attempts
  )
  SELECT c.id, c.source_course_id, c.provider_code, c.canonical_code, c.missing_fields, c.attempts
  FROM claimed c;
END;
$$;

-- 6) WORKER COMPLETE FUNCTION (mark job done/failed)
CREATE OR REPLACE FUNCTION public.complete_enrichment_job(
  p_queue_id UUID,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INTEGER;
BEGIN
  IF NOT public.is_service_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: requires service_role or admin'
      USING ERRCODE = '42501';
  END IF;

  -- Get current attempts
  SELECT attempts INTO v_attempts 
  FROM public.canonical_enrichment_queue 
  WHERE id = p_queue_id;

  IF p_success THEN
    UPDATE public.canonical_enrichment_queue
    SET 
      enrichment_status = 'succeeded',
      completed_at = now(),
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
    WHERE id = p_queue_id;
  ELSE
    -- Backoff: 15m for first 3, 6h for next 3, then fail
    UPDATE public.canonical_enrichment_queue
    SET 
      enrichment_status = CASE 
        WHEN v_attempts >= 6 THEN 'failed'
        WHEN p_error_code = 'BLOCKED' THEN 'blocked'
        ELSE 'queued'
      END,
      attempts = v_attempts + 1,
      last_attempt_at = now(),
      last_error = p_error_message,
      last_error_code = p_error_code,
      next_attempt_at = CASE
        WHEN v_attempts < 3 THEN now() + interval '15 minutes'
        WHEN v_attempts < 6 THEN now() + interval '6 hours'
        ELSE now() + interval '24 hours'
      END,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
    WHERE id = p_queue_id;
  END IF;
END;
$$;

-- Comments
COMMENT ON TABLE public.canonical_enrichment_evidence IS 'Append-only audit trail of all enrichment fetch attempts with raw evidence';
COMMENT ON FUNCTION public.claim_enrichment_jobs IS 'Atomically claim batch of enrichment jobs with SKIP LOCKED for concurrent workers';
COMMENT ON FUNCTION public.complete_enrichment_job IS 'Mark enrichment job as succeeded/failed with exponential backoff';
COMMENT ON VIEW public.enrichment_stuck IS 'Queue items that are stuck (too many attempts or stale locks)';
COMMENT ON VIEW public.enrichment_evidence_freshness IS 'Evidence collection stats per provider';

-- Evidence backfill pipeline: jobs table for harvesting/verifying evidence URLs
CREATE TABLE public.evidence_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Tuple key (matches credit_transfer_rules)
  target_institution_norm TEXT NOT NULL,
  source_institution_norm TEXT NOT NULL,
  source_course_code_norm TEXT NOT NULL,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'found', 'not_found', 'needs_review', 'error')),
  
  -- Evidence data (populated when found)
  evidence_url TEXT,
  evidence_type TEXT CHECK (evidence_type IN ('articulation_pdf', 'equivalency_page', 'catalog_page', 'partner_agreement', 'manual_entry', NULL)),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  evidence_snippet TEXT, -- Store relevant text excerpt for verification
  
  -- Provenance tracking
  source_hash TEXT, -- Hash of source page content for drift detection
  last_checked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ DEFAULT now(),
  check_count INTEGER DEFAULT 0,
  
  -- Metadata
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Uniqueness: one job per tuple
  CONSTRAINT evidence_jobs_unique_tuple UNIQUE (target_institution_norm, source_institution_norm, source_course_code_norm)
);

-- Indexes for worker queries
CREATE INDEX idx_evidence_jobs_status_next ON evidence_jobs(status, next_check_at) WHERE status IN ('queued', 'needs_review');
CREATE INDEX idx_evidence_jobs_tuple ON evidence_jobs(target_institution_norm, source_institution_norm, source_course_code_norm);

-- Trigger for updated_at
CREATE TRIGGER update_evidence_jobs_updated_at
  BEFORE UPDATE ON evidence_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (service role only for worker)
ALTER TABLE evidence_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access" ON evidence_jobs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE evidence_jobs IS 'Evidence backfill pipeline: tracks harvesting/verification of evidence URLs for credit transfer rules';
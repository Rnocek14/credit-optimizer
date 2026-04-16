
-- Table for AI-generated transfer rule candidates (review queue)
CREATE TABLE IF NOT EXISTS public.transfer_rule_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_institution TEXT NOT NULL,
  source_course_code TEXT NOT NULL,
  source_course_title TEXT,
  target_institution TEXT NOT NULL,
  target_course_code TEXT,
  target_course_title TEXT,
  acceptance_status TEXT NOT NULL CHECK (acceptance_status IN ('accepted', 'elective', 'rejected')),
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  evidence_url TEXT,
  evidence_text TEXT,
  rule_source TEXT DEFAULT 'ai_extraction',
  ai_model TEXT,
  batch_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'promoted', 'rejected', 'duplicate')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  promotion_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_trc_status ON public.transfer_rule_candidates(status);
CREATE INDEX idx_trc_target ON public.transfer_rule_candidates(target_institution);
CREATE INDEX idx_trc_batch ON public.transfer_rule_candidates(batch_id);
CREATE INDEX idx_trc_confidence ON public.transfer_rule_candidates(confidence_score DESC);
CREATE UNIQUE INDEX idx_trc_dedup ON public.transfer_rule_candidates(
  source_institution, source_course_code, target_institution, target_course_code
) WHERE status NOT IN ('rejected', 'duplicate');

-- RLS
ALTER TABLE public.transfer_rule_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to transfer rule candidates"
  ON public.transfer_rule_candidates FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert candidates"
  ON public.transfer_rule_candidates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates"
  ON public.transfer_rule_candidates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_trc_updated_at
  BEFORE UPDATE ON public.transfer_rule_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

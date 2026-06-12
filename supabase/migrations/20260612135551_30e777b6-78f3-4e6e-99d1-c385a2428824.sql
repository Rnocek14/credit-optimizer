
-- Phase 1: California ASSIST ingestion — provenance-first schema

ALTER TABLE public.credit_transfer_rules
  ADD COLUMN IF NOT EXISTS provenance_system TEXT,
  ADD COLUMN IF NOT EXISTS articulation_agreement_id UUID;

CREATE INDEX IF NOT EXISTS idx_ctr_provenance_system
  ON public.credit_transfer_rules(provenance_system)
  WHERE provenance_system IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ctr_articulation_agreement
  ON public.credit_transfer_rules(articulation_agreement_id)
  WHERE articulation_agreement_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.articulation_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  from_institution_code TEXT NOT NULL,
  to_institution_code TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  major_code TEXT,
  major_name TEXT,
  agreement_type TEXT NOT NULL DEFAULT 'course-to-course',
  source_url TEXT NOT NULL,
  pdf_snapshot_url TEXT,
  raw_html TEXT,
  raw_markdown TEXT,
  effective_date DATE,
  expires_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  fetch_error TEXT,
  fetched_at TIMESTAMPTZ,
  parsed_at TIMESTAMPTZ,
  rules_extracted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_articulation_agreements_key
  ON public.articulation_agreements(source_system, from_institution_code, to_institution_code, academic_year, COALESCE(major_code, ''));

CREATE INDEX IF NOT EXISTS idx_articulation_agreements_status
  ON public.articulation_agreements(status, source_system);

GRANT SELECT ON public.articulation_agreements TO anon;
GRANT SELECT ON public.articulation_agreements TO authenticated;
GRANT ALL ON public.articulation_agreements TO service_role;
ALTER TABLE public.articulation_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read articulation agreements"
  ON public.articulation_agreements FOR SELECT
  USING (true);

CREATE POLICY "Admins write articulation agreements"
  ON public.articulation_agreements FOR ALL
  USING (public.is_service_or_admin())
  WITH CHECK (public.is_service_or_admin());

CREATE TABLE IF NOT EXISTS public.assist_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL DEFAULT 'ASSIST',
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  agreements_discovered INTEGER NOT NULL DEFAULT 0,
  agreements_fetched INTEGER NOT NULL DEFAULT 0,
  agreements_parsed INTEGER NOT NULL DEFAULT 0,
  rules_inserted INTEGER NOT NULL DEFAULT 0,
  rules_superseded INTEGER NOT NULL DEFAULT 0,
  evidence_rows_inserted INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  parameters JSONB,
  started_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assist_runs_started_at
  ON public.assist_ingestion_runs(started_at DESC);

GRANT SELECT ON public.assist_ingestion_runs TO authenticated;
GRANT ALL ON public.assist_ingestion_runs TO service_role;
ALTER TABLE public.assist_ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read assist runs"
  ON public.assist_ingestion_runs FOR SELECT
  TO authenticated
  USING (public.is_service_or_admin());

CREATE POLICY "Admins write assist runs"
  ON public.assist_ingestion_runs FOR ALL
  USING (public.is_service_or_admin())
  WITH CHECK (public.is_service_or_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_articulation_agreements_updated_at ON public.articulation_agreements;
CREATE TRIGGER trg_articulation_agreements_updated_at
  BEFORE UPDATE ON public.articulation_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ctr_articulation_agreement'
  ) THEN
    ALTER TABLE public.credit_transfer_rules
      ADD CONSTRAINT fk_ctr_articulation_agreement
      FOREIGN KEY (articulation_agreement_id)
      REFERENCES public.articulation_agreements(id)
      ON DELETE SET NULL;
  END IF;
END $$;

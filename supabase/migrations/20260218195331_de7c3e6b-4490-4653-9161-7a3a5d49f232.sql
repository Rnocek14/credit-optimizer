
-- =============================================
-- Fix duplicates + schema for requirements scraper
-- =============================================

-- Dedup CS-315: delete unreferenced
DELETE FROM public.edu_courses WHERE id = '77ec44bd-2aa2-4188-87d4-8db5ff566818';

-- Dedup CS-410: reassign refs, delete dupe
UPDATE public.block_members SET course_id = 'c229aff9-16b5-49a7-bce3-fcb71a490183'
  WHERE course_id = '7e680207-0bc3-4bed-96ff-1bb1086b8b12'
  AND NOT EXISTS (
    SELECT 1 FROM block_members bm2 
    WHERE bm2.block_id = block_members.block_id 
    AND bm2.course_id = 'c229aff9-16b5-49a7-bce3-fcb71a490183'
  );
DELETE FROM public.block_members WHERE course_id = '7e680207-0bc3-4bed-96ff-1bb1086b8b12';
DELETE FROM public.edu_courses WHERE id = '7e680207-0bc3-4bed-96ff-1bb1086b8b12';

-- DS-301: different courses same code → rename to DS-310
UPDATE public.edu_courses SET code = 'DS-310' WHERE id = 'e880ef5c-8118-4e74-a960-39433ff70296';

-- =============================================
-- edu_courses: add institution_code, code_norm, source_url, extracted_at
-- =============================================
ALTER TABLE public.edu_courses
  ADD COLUMN IF NOT EXISTS institution_code TEXT NOT NULL DEFAULT 'GENERIC',
  ADD COLUMN IF NOT EXISTS code_norm TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;

UPDATE public.edu_courses SET code_norm = upper(replace(code, ' ', '')) WHERE code_norm IS NULL;

CREATE UNIQUE INDEX uq_edu_courses_inst_code_norm
  ON public.edu_courses (institution_code, code_norm);

-- =============================================
-- requirement_blocks: add is_residency_required, fix slug uniqueness
-- =============================================
ALTER TABLE public.requirement_blocks
  ADD COLUMN IF NOT EXISTS is_residency_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.requirement_blocks DROP CONSTRAINT IF EXISTS requirement_blocks_slug_key;

CREATE UNIQUE INDEX uq_requirement_blocks_program_slug
  ON public.requirement_blocks (coalesce(program_id, '__global__'), slug)
  WHERE slug IS NOT NULL;

-- =============================================
-- requirements_scrape_runs tracking table
-- =============================================
CREATE TABLE public.requirements_scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_catalog_id UUID NOT NULL REFERENCES public.program_catalog(id),
  institution_code TEXT NOT NULL,
  program_slug TEXT NOT NULL,
  catalog_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scraping', 'extracting', 'writing', 'completed', 'completed_with_warnings', 'failed', 'quarantined')),
  page_markdown TEXT,
  page_hash TEXT,
  token_count INTEGER,
  extracted_json JSONB,
  blocks_written INTEGER DEFAULT 0,
  courses_written INTEGER DEFAULT 0,
  warnings JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_scrape_runs_program ON public.requirements_scrape_runs(program_catalog_id);
CREATE INDEX idx_scrape_runs_status ON public.requirements_scrape_runs(status);

ALTER TABLE public.requirements_scrape_runs ENABLE ROW LEVEL SECURITY;

-- Use has_role() which exists in this project
CREATE POLICY "Admin read scrape runs" ON public.requirements_scrape_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert scrape runs" ON public.requirements_scrape_runs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update scrape runs" ON public.requirements_scrape_runs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role full access scrape runs" ON public.requirements_scrape_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

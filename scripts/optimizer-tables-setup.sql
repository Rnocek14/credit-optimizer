-- ============================================================================
-- Optimizer Database Setup - Week 1
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to create all 5 optimizer tables
-- and seed TESU BSBA policy data
-- ============================================================================

-- 1. CREATE institution_credit_limits TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institution_credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  limit_type TEXT NOT NULL CHECK (limit_type IN (
    'total_credits', 'total_transfer', 'alt_credit_max', 'comm_college_max',
    'min_ra_credit', 'min_residency', 'upper_division_min',
    'clep_max', 'dsst_max', 'ace_max', 'nccrs_max', 'per_provider_max'
  )),
  credit_value INTEGER NOT NULL,
  provider_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, limit_type, provider_code)
);

CREATE INDEX IF NOT EXISTS idx_institution_credit_limits_institution ON public.institution_credit_limits(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_credit_limits_type ON public.institution_credit_limits(limit_type);

ALTER TABLE public.institution_credit_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view institution credit limits" ON public.institution_credit_limits;
CREATE POLICY "Anyone can view institution credit limits"
  ON public.institution_credit_limits FOR SELECT TO authenticated USING (true);

-- 2. CREATE alt_credits TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alt_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code TEXT NOT NULL CHECK (source_code IN (
    'CLEP', 'DSST', 'SOPHIA', 'STUDY_COM', 'STRAIGHTERLINE',
    'COURSERA', 'SAYLOR', 'MODERNSTATES', 'OTHER_ACE', 'OTHER_NCCRS'
  )),
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  credits_typical INTEGER NOT NULL,
  level INTEGER CHECK (level IN (100, 200, 300, 400)),
  subject_area TEXT,
  ace_id TEXT,
  ace_expiration_date DATE,
  nccrs_id TEXT,
  learning_outcomes JSONB,
  cost_usd NUMERIC(10, 2),
  duration_estimate_weeks INTEGER,
  exam_based BOOLEAN DEFAULT false,
  provider_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_code, identifier)
);

CREATE INDEX IF NOT EXISTS idx_alt_credits_source ON public.alt_credits(source_code);
CREATE INDEX IF NOT EXISTS idx_alt_credits_subject ON public.alt_credits(subject_area);
CREATE INDEX IF NOT EXISTS idx_alt_credits_level ON public.alt_credits(level);
CREATE INDEX IF NOT EXISTS idx_alt_credits_cost ON public.alt_credits(cost_usd);

ALTER TABLE public.alt_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view alt credits" ON public.alt_credits;
CREATE POLICY "Anyone can view alt credits"
  ON public.alt_credits FOR SELECT TO authenticated USING (true);

-- 3. CREATE cross_institution_equivalencies TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cross_institution_equivalencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alt_credit_id UUID REFERENCES public.alt_credits(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  institutional_course_code TEXT NOT NULL,
  institutional_course_name TEXT,
  credits_awarded INTEGER NOT NULL,
  level INTEGER CHECK (level IN (100, 200, 300, 400)),
  gened_category_code TEXT,
  requirement_area TEXT CHECK (requirement_area IN (
    'gened', 'major', 'elective', 'capstone', 'free_elective'
  )),
  confidence NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source_documentation TEXT,
  last_verified_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alt_credit_id, institution_id, institutional_course_code)
);

CREATE INDEX IF NOT EXISTS idx_equivalencies_alt_credit ON public.cross_institution_equivalencies(alt_credit_id);
CREATE INDEX IF NOT EXISTS idx_equivalencies_institution ON public.cross_institution_equivalencies(institution_id);
CREATE INDEX IF NOT EXISTS idx_equivalencies_gened_category ON public.cross_institution_equivalencies(gened_category_code);
CREATE INDEX IF NOT EXISTS idx_equivalencies_confidence ON public.cross_institution_equivalencies(confidence);

ALTER TABLE public.cross_institution_equivalencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view cross institution equivalencies" ON public.cross_institution_equivalencies;
CREATE POLICY "Anyone can view cross institution equivalencies"
  ON public.cross_institution_equivalencies FOR SELECT TO authenticated USING (true);

-- 4. CREATE gened_categories TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gened_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  credits_required INTEGER NOT NULL,
  min_grade TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, category_code)
);

CREATE INDEX IF NOT EXISTS idx_gened_categories_institution ON public.gened_categories(institution_id);
CREATE INDEX IF NOT EXISTS idx_gened_categories_code ON public.gened_categories(category_code);

ALTER TABLE public.gened_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gened categories" ON public.gened_categories;
CREATE POLICY "Anyone can view gened categories"
  ON public.gened_categories FOR SELECT TO authenticated USING (true);

-- 5. CREATE degree_templates TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.degree_templates (
  id TEXT PRIMARY KEY,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  institution_code TEXT NOT NULL,
  program_code TEXT NOT NULL,
  program_name TEXT NOT NULL,
  track_type TEXT NOT NULL CHECK (track_type IN (
    'standard', 'fastest', 'cheapest', 'alt_max', 'hybrid'
  )),
  total_credits INTEGER NOT NULL,
  estimated_cost NUMERIC(10, 2),
  estimated_duration_months INTEGER,
  template_data JSONB NOT NULL,
  catalog_year TEXT,
  policy_last_verified DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_degree_templates_institution ON public.degree_templates(institution_id);
CREATE INDEX IF NOT EXISTS idx_degree_templates_institution_code ON public.degree_templates(institution_code);
CREATE INDEX IF NOT EXISTS idx_degree_templates_program ON public.degree_templates(program_code);
CREATE INDEX IF NOT EXISTS idx_degree_templates_track ON public.degree_templates(track_type);

ALTER TABLE public.degree_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view degree templates" ON public.degree_templates;
CREATE POLICY "Anyone can view degree templates"
  ON public.degree_templates FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- SEED TESU BSBA POLICY DATA
-- ============================================================================
-- ⚠️ LEGACY SEED DATA - For testing only
-- The authoritative policy data lives in institution_policy_packs table.
-- These seeds may conflict with verified policy pack values.
-- See: institution_policy_packs.policy_data for verified caps.
-- ============================================================================

-- Ensure TESU institution exists
INSERT INTO public.institutions (code, name, type, website_url, accreditation_level, reputation_score, verification_status, metadata)
VALUES (
  'TESU',
  'Thomas Edison State University',
  'university',
  'https://www.tesu.edu',
  'Regional',
  85,
  'verified',
  '{}'::jsonb
)
ON CONFLICT (code) DO UPDATE SET updated_at = now()
RETURNING id;

-- Seed TESU credit limits
-- ⚠️ NOTE: alt_credit_max here (80) may differ from policy_pack value.
-- Policy pack is authoritative for runtime enforcement.
INSERT INTO public.institution_credit_limits (institution_id, limit_type, credit_value, provider_code, notes)
SELECT 
  (SELECT id FROM public.institutions WHERE code = 'TESU'),
  limit_type,
  credit_value,
  provider_code,
  notes
FROM (VALUES
  ('total_credits', 120, NULL, 'Standard bachelor degree requirement'),
  ('min_residency', 15, NULL, 'Can be satisfied with cornerstone + capstone + 9 other credits'),
  ('upper_division_min', 30, NULL, 'Minimum 300/400 level credits required - VERIFY from catalog before using'),
  ('total_transfer', 113, NULL, 'Max credits that can transfer (120 - 15 residency + waivers)'),
  ('alt_credit_max', 80, NULL, 'LEGACY: Max ACE/NCCRS - see policy_pack for verified value'),
  ('min_ra_credit', 40, NULL, 'Minimum regionally-accredited credits'),
  ('clep_max', 40, NULL, 'LEGACY: Per-provider cap - verify provenance before enforcing'),
  ('dsst_max', 30, NULL, 'LEGACY: Per-provider cap - verify provenance before enforcing'),
  ('per_provider_max', 30, 'STUDY_COM', 'LEGACY: Per-provider cap - verify provenance before enforcing'),
  ('per_provider_max', 90, 'SOPHIA', 'LEGACY: Per-provider cap - verify provenance before enforcing'),
  ('per_provider_max', 30, 'STRAIGHTERLINE', 'LEGACY: Per-provider cap - verify provenance before enforcing')
) AS v(limit_type, credit_value, provider_code, notes)
ON CONFLICT (institution_id, limit_type, provider_code) DO NOTHING;

-- Seed TESU gen-ed categories
INSERT INTO public.gened_categories (institution_id, category_code, category_name, credits_required, description, display_order)
SELECT
  (SELECT id FROM public.institutions WHERE code = 'TESU'),
  category_code,
  category_name,
  credits_required,
  description,
  display_order
FROM (VALUES
  ('WRITTEN_COMM', 'Written Communication', 6, 'English Composition I & II or equivalent', 1),
  ('ORAL_COMM', 'Oral Communication', 3, 'Public Speaking or Communication course', 2),
  ('QUANTITATIVE', 'Quantitative Literacy', 3, 'College Algebra or higher mathematics', 3),
  ('HUMANITIES', 'Humanities', 9, 'Literature, Philosophy, Arts, or related fields', 4),
  ('SOCIAL_SCIENCE', 'Social Sciences', 9, 'Psychology, Sociology, Economics, History, etc.', 5),
  ('NATURAL_SCIENCE', 'Natural Sciences', 6, 'Biology, Chemistry, Physics, or Earth Science', 6),
  ('CIVIC_GLOBAL', 'Civic & Global Engagement', 3, 'Diversity, Ethics, or Global Awareness', 7)
) AS v(category_code, category_name, credits_required, description, display_order)
ON CONFLICT (institution_id, category_code) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything was created successfully

-- Check all tables exist
SELECT 
  'institution_credit_limits' as table_name, 
  COUNT(*) as row_count 
FROM public.institution_credit_limits
UNION ALL
SELECT 'alt_credits', COUNT(*) FROM public.alt_credits
UNION ALL
SELECT 'cross_institution_equivalencies', COUNT(*) FROM public.cross_institution_equivalencies
UNION ALL
SELECT 'gened_categories', COUNT(*) FROM public.gened_categories
UNION ALL
SELECT 'degree_templates', COUNT(*) FROM public.degree_templates;

-- View TESU limits
SELECT * FROM public.institution_credit_limits
WHERE institution_id = (SELECT id FROM public.institutions WHERE code = 'TESU')
ORDER BY limit_type, provider_code;

-- View TESU gen-ed categories
SELECT * FROM public.gened_categories
WHERE institution_id = (SELECT id FROM public.institutions WHERE code = 'TESU')
ORDER BY display_order;

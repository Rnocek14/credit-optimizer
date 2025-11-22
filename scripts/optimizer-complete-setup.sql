-- ============================================================================
-- COMPLETE OPTIMIZER DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Add code column to institutions table
-- ============================================================================

ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions(code);

-- Ensure TESU exists
INSERT INTO institutions (id, name, code, type, reputation_score, verification_status, metadata)
VALUES (
  gen_random_uuid(),
  'Thomas Edison State University',
  'TESU',
  'university',
  85,
  'verified',
  '{}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- Update existing institutions with codes
UPDATE institutions SET code = 'STANFORD' WHERE name ILIKE '%stanford%' AND code IS NULL;
UPDATE institutions SET code = 'MIT' WHERE name ILIKE '%mit%' AND code IS NULL;
UPDATE institutions SET code = 'HARVARD' WHERE name ILIKE '%harvard%' AND code IS NULL;

-- ============================================================================
-- STEP 2: Create update trigger function (reusable)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create alt_credits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alt_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code TEXT NOT NULL CHECK (source_code IN ('CLEP', 'DSST', 'SOPHIA', 'STUDY_COM')),
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  credits_typical INTEGER NOT NULL CHECK (credits_typical > 0),
  level INTEGER CHECK (level IN (100, 200, 300, 400)),
  subject_area TEXT,
  cost_usd NUMERIC(10, 2),
  duration_estimate_weeks INTEGER,
  exam_based BOOLEAN DEFAULT false,
  provider_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_code, identifier)
);

CREATE INDEX IF NOT EXISTS idx_alt_credits_source ON alt_credits(source_code);
CREATE INDEX IF NOT EXISTS idx_alt_credits_subject ON alt_credits(subject_area);

ALTER TABLE alt_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view alt_credits" ON alt_credits;
CREATE POLICY "Anyone can view alt_credits"
  ON alt_credits FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage alt_credits" ON alt_credits;
CREATE POLICY "Service role can manage alt_credits"
  ON alt_credits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_alt_credits_updated_at ON alt_credits;
CREATE TRIGGER update_alt_credits_updated_at
  BEFORE UPDATE ON alt_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Create cross_institution_equivalencies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS cross_institution_equivalencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alt_credit_id UUID NOT NULL REFERENCES alt_credits(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  institutional_course_code TEXT NOT NULL,
  institutional_course_name TEXT,
  credits_awarded INTEGER NOT NULL CHECK (credits_awarded > 0),
  level INTEGER CHECK (level IN (100, 200, 300, 400)),
  requirement_area TEXT CHECK (requirement_area IN ('gened', 'major', 'elective', 'capstone')),
  gened_category_code TEXT,
  confidence NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  last_verified_date DATE,
  source_documentation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alt_credit_id, institution_id, institutional_course_code)
);

CREATE INDEX IF NOT EXISTS idx_equivalencies_alt_credit ON cross_institution_equivalencies(alt_credit_id);
CREATE INDEX IF NOT EXISTS idx_equivalencies_institution ON cross_institution_equivalencies(institution_id);
CREATE INDEX IF NOT EXISTS idx_equivalencies_course_code ON cross_institution_equivalencies(institutional_course_code);

ALTER TABLE cross_institution_equivalencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view equivalencies" ON cross_institution_equivalencies;
CREATE POLICY "Anyone can view equivalencies"
  ON cross_institution_equivalencies FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage equivalencies" ON cross_institution_equivalencies;
CREATE POLICY "Service role can manage equivalencies"
  ON cross_institution_equivalencies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_equivalencies_updated_at ON cross_institution_equivalencies;
CREATE TRIGGER update_equivalencies_updated_at
  BEFORE UPDATE ON cross_institution_equivalencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Create degree_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS degree_templates (
  id TEXT PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  institution_code TEXT NOT NULL,
  program_code TEXT NOT NULL,
  program_name TEXT NOT NULL,
  track_type TEXT NOT NULL CHECK (track_type IN ('standard', 'fastest', 'cheapest', 'alt_max', 'hybrid')),
  total_credits INTEGER NOT NULL CHECK (total_credits > 0),
  estimated_cost NUMERIC(10, 2),
  estimated_duration_months INTEGER,
  catalog_year TEXT,
  policy_last_verified DATE,
  template_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_institution ON degree_templates(institution_id);
CREATE INDEX IF NOT EXISTS idx_templates_program ON degree_templates(program_code);
CREATE INDEX IF NOT EXISTS idx_templates_track ON degree_templates(track_type);

ALTER TABLE degree_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view templates" ON degree_templates;
CREATE POLICY "Anyone can view templates"
  ON degree_templates FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage templates" ON degree_templates;
CREATE POLICY "Service role can manage templates"
  ON degree_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_templates_updated_at ON degree_templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON degree_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Create gened_frameworks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS gened_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  framework_code TEXT NOT NULL,
  total_credits INTEGER NOT NULL CHECK (total_credits > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, framework_code)
);

CREATE INDEX IF NOT EXISTS idx_frameworks_institution ON gened_frameworks(institution_id);

ALTER TABLE gened_frameworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view frameworks" ON gened_frameworks;
CREATE POLICY "Anyone can view frameworks"
  ON gened_frameworks FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage frameworks" ON gened_frameworks;
CREATE POLICY "Service role can manage frameworks"
  ON gened_frameworks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_frameworks_updated_at ON gened_frameworks;
CREATE TRIGGER update_frameworks_updated_at
  BEFORE UPDATE ON gened_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Create gened_categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS gened_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES gened_frameworks(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  credits_required INTEGER NOT NULL CHECK (credits_required > 0),
  min_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(framework_id, category_code)
);

CREATE INDEX IF NOT EXISTS idx_categories_framework ON gened_categories(framework_id);
CREATE INDEX IF NOT EXISTS idx_categories_code ON gened_categories(category_code);

ALTER TABLE gened_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON gened_categories;
CREATE POLICY "Anyone can view categories"
  ON gened_categories FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage categories" ON gened_categories;
CREATE POLICY "Service role can manage categories"
  ON gened_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_categories_updated_at ON gened_categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON gened_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: Create institution_credit_limits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS institution_credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL CHECK (limit_type IN (
    'total_credits',
    'alt_credit_max',
    'transfer_max',
    'residency_min',
    'per_provider_max',
    'per_course_type_max'
  )),
  credit_value INTEGER NOT NULL,
  provider_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_limits_institution ON institution_credit_limits(institution_id);
CREATE INDEX IF NOT EXISTS idx_limits_type ON institution_credit_limits(limit_type);

ALTER TABLE institution_credit_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view limits" ON institution_credit_limits;
CREATE POLICY "Anyone can view limits"
  ON institution_credit_limits FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can manage limits" ON institution_credit_limits;
CREATE POLICY "Service role can manage limits"
  ON institution_credit_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_limits_updated_at ON institution_credit_limits;
CREATE TRIGGER update_limits_updated_at
  BEFORE UPDATE ON institution_credit_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist
SELECT 
  'alt_credits' as table_name, 
  COUNT(*) as row_count 
FROM alt_credits
UNION ALL
SELECT 
  'cross_institution_equivalencies', 
  COUNT(*) 
FROM cross_institution_equivalencies
UNION ALL
SELECT 
  'degree_templates', 
  COUNT(*) 
FROM degree_templates
UNION ALL
SELECT 
  'gened_frameworks', 
  COUNT(*) 
FROM gened_frameworks
UNION ALL
SELECT 
  'gened_categories', 
  COUNT(*) 
FROM gened_categories
UNION ALL
SELECT 
  'institution_credit_limits', 
  COUNT(*) 
FROM institution_credit_limits;

-- Verify TESU exists
SELECT id, name, code FROM institutions WHERE code = 'TESU';

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- All optimizer tables are now created with proper RLS policies.
-- You can now use the "Seed Optimizer Data" button to populate the tables.
-- ============================================================================

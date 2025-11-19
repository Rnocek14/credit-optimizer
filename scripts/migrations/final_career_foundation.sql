-- =====================================================
-- Final Career Foundation Migration (Idempotent)
-- Creates career_paths + career_path_programs tables
-- Seeds with demo data - Safe to run multiple times
-- =====================================================

-- ===================
-- 1. CAREER PATHS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS career_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  summary TEXT,
  average_salary INT,
  baseline_salary INT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add slug column if it doesn't exist (for older instances)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_paths' AND column_name = 'slug'
  ) THEN
    ALTER TABLE career_paths ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

-- Public read policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'career_paths' AND policyname = 'Anyone can read career paths'
  ) THEN
    CREATE POLICY "Anyone can read career paths"
      ON career_paths FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- ===================
-- 2. CAREER PATH PROGRAMS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS career_path_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id UUID NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  anchor_school TEXT NOT NULL,
  strength INT DEFAULT 85,
  path_type TEXT DEFAULT 'degree',
  region_code TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(career_path_id, program_id, anchor_school)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cpp_career ON career_path_programs(career_path_id);
CREATE INDEX IF NOT EXISTS idx_cpp_program ON career_path_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_cpp_school ON career_path_programs(anchor_school);
CREATE INDEX IF NOT EXISTS idx_cpp_strength ON career_path_programs(strength DESC);

-- Enable RLS
ALTER TABLE career_path_programs ENABLE ROW LEVEL SECURITY;

-- Public read policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'career_path_programs' AND policyname = 'Anyone can read career program mappings'
  ) THEN
    CREATE POLICY "Anyone can read career program mappings"
      ON career_path_programs FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- ===================
-- 3. SEED DATA (Idempotent)
-- ===================

-- Clear existing seed data
DELETE FROM career_path_programs WHERE career_path_id IN (
  SELECT id FROM career_paths WHERE slug IN ('software-engineer', 'data-analyst', 'cybersecurity-analyst')
);
DELETE FROM career_paths WHERE slug IN ('software-engineer', 'data-analyst', 'cybersecurity-analyst');

-- Insert careers
INSERT INTO career_paths (title, slug, summary, average_salary, baseline_salary, industry)
VALUES
  (
    'Software Engineer',
    'software-engineer',
    'Design, develop, and maintain software applications and systems. Work with modern programming languages, frameworks, and development tools.',
    95000,
    45000,
    'Technology'
  ),
  (
    'Data Analyst',
    'data-analyst',
    'Analyze complex datasets to derive actionable insights. Use statistical methods, data visualization, and business intelligence tools.',
    75000,
    42000,
    'Technology'
  ),
  (
    'Cybersecurity Analyst',
    'cybersecurity-analyst',
    'Protect organizational systems and data from cyber threats. Monitor security infrastructure, respond to incidents, and implement security measures.',
    88000,
    48000,
    'Technology'
  );

-- Insert program mappings
DO $$
DECLARE
  v_se_id UUID;
  v_da_id UUID;
  v_cs_id UUID;
BEGIN
  -- Get career IDs
  SELECT id INTO v_se_id FROM career_paths WHERE slug = 'software-engineer';
  SELECT id INTO v_da_id FROM career_paths WHERE slug = 'data-analyst';
  SELECT id INTO v_cs_id FROM career_paths WHERE slug = 'cybersecurity-analyst';

  -- Software Engineer mappings
  INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
  VALUES
    (v_se_id, 'bs_cs', 'TESU', 95, 'Top match: CS degree, flexible transfer'),
    (v_se_id, 'bs_cs', 'WGU', 88, 'Strong alternative: competency-based'),
    (v_se_id, 'bs_cs', 'EXCU', 82, 'Good fit: affordable CS program'),
    (v_se_id, 'bs_it', 'TESU', 75, 'Alternative: IT focus');

  -- Data Analyst mappings
  INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
  VALUES
    (v_da_id, 'bs_it', 'TESU', 90, 'Top match: IT with data focus'),
    (v_da_id, 'bs_it', 'WGU', 85, 'Strong: analytics emphasis'),
    (v_da_id, 'bs_ds', 'UMGC', 88, 'Data Science specialization');

  -- Cybersecurity Analyst mappings
  INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
  VALUES
    (v_cs_id, 'bs_cybersec', 'WGU', 95, 'Top match: dedicated cybersecurity'),
    (v_cs_id, 'bs_cybersec', 'UMGC', 90, 'Strong: NIST/NSA focus'),
    (v_cs_id, 'bs_it', 'TESU', 80, 'Alternative: IT with security');

END $$;

-- ===================
-- 4. VERIFICATION
-- ===================

DO $$
DECLARE
  v_career_count INT;
  v_mapping_count INT;
BEGIN
  SELECT COUNT(*) INTO v_career_count FROM career_paths;
  SELECT COUNT(*) INTO v_mapping_count FROM career_path_programs;
  
  RAISE NOTICE '✅ Migration complete:';
  RAISE NOTICE '   - career_paths: % rows', v_career_count;
  RAISE NOTICE '   - career_path_programs: % mappings', v_mapping_count;
END $$;

-- Show summary
SELECT 
  cp.title as career,
  COUNT(cpp.id) as mapped_programs,
  ARRAY_AGG(cpp.anchor_school || ' (' || cpp.program_id || ')' ORDER BY cpp.strength DESC) as programs
FROM career_paths cp
LEFT JOIN career_path_programs cpp ON cpp.career_path_id = cp.id
GROUP BY cp.id, cp.title
ORDER BY cp.title;

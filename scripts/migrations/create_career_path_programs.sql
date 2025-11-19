-- =====================================================
-- Career Path Programs Migration
-- Maps career paths to degree programs + anchor schools
-- =====================================================

-- Create the career_path_programs table
CREATE TABLE IF NOT EXISTS career_path_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id UUID REFERENCES career_paths(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  anchor_school TEXT NOT NULL,
  strength INT DEFAULT 80 CHECK (strength >= 0 AND strength <= 100),
  
  -- Future-proofing for Phase 2+
  path_type TEXT DEFAULT 'degree' CHECK (path_type IN ('degree', 'bootcamp', 'cert', 'apprenticeship')),
  region_code TEXT,
  valid_from DATE,
  valid_until DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate mappings
  UNIQUE(career_path_id, program_id, anchor_school)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cpp_career ON career_path_programs(career_path_id) 
  WHERE valid_until IS NULL OR valid_until > now();
CREATE INDEX IF NOT EXISTS idx_cpp_program ON career_path_programs(program_id, anchor_school);
CREATE INDEX IF NOT EXISTS idx_cpp_strength ON career_path_programs(strength DESC);

-- Enable RLS
ALTER TABLE career_path_programs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active career-program mappings
DROP POLICY IF EXISTS "Anyone can read active career-program mappings" ON career_path_programs;
CREATE POLICY "Anyone can read active career-program mappings"
  ON career_path_programs FOR SELECT
  USING (valid_until IS NULL OR valid_until > now());

-- =====================================================
-- Seed Initial Career-Program Mappings
-- =====================================================

-- Software Engineer → BS CS @ TESU, WGU, EXCU
DO $$
DECLARE
  software_engineer_id UUID;
BEGIN
  -- Find Software Engineer career path
  SELECT id INTO software_engineer_id
  FROM career_paths 
  WHERE title ILIKE '%Software Engineer%' 
     OR slug = 'software-engineer'
     OR slug LIKE '%software-engineer%'
  LIMIT 1;

  IF software_engineer_id IS NOT NULL THEN
    -- Insert mappings
    INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
    VALUES
      (software_engineer_id, 'bs_cs', 'TESU', 90, 'Highest transfer credit acceptance, most cost-effective'),
      (software_engineer_id, 'bs_cs', 'WGU', 85, 'Self-paced competency-based, fastest completion'),
      (software_engineer_id, 'bs_cs', 'EXCU', 85, 'Strong ACE/CLEP acceptance, flexible pacing')
    ON CONFLICT (career_path_id, program_id, anchor_school) DO NOTHING;
  END IF;
END $$;

-- Data Analyst → BS CS, BS IT @ TESU, WGU, UMGC
DO $$
DECLARE
  data_analyst_id UUID;
BEGIN
  SELECT id INTO data_analyst_id
  FROM career_paths 
  WHERE title ILIKE '%Data Analyst%'
     OR slug = 'data-analyst'
     OR slug LIKE '%data-analyst%'
  LIMIT 1;

  IF data_analyst_id IS NOT NULL THEN
    INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
    VALUES
      (data_analyst_id, 'bs_cs', 'TESU', 80, 'Strong analytical foundation with CS focus'),
      (data_analyst_id, 'bs_cs', 'WGU', 80, 'Fast-track CS degree with data emphasis'),
      (data_analyst_id, 'bs_it', 'TESU', 75, 'IT degree with data analytics track'),
      (data_analyst_id, 'bs_it', 'WGU', 75, 'IT degree with data management focus'),
      (data_analyst_id, 'bs_it', 'UMGC', 75, 'IT degree with business intelligence track')
    ON CONFLICT (career_path_id, program_id, anchor_school) DO NOTHING;
  END IF;
END $$;

-- Cybersecurity Analyst → BS IT @ WGU, UMGC
DO $$
DECLARE
  cyber_analyst_id UUID;
BEGIN
  SELECT id INTO cyber_analyst_id
  FROM career_paths 
  WHERE title ILIKE '%Cybersecurity%'
     OR slug LIKE '%cyber%'
     OR title ILIKE '%Security%'
  LIMIT 1;

  IF cyber_analyst_id IS NOT NULL THEN
    INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
    VALUES
      (cyber_analyst_id, 'bs_it', 'WGU', 85, 'Dedicated Cybersecurity program with industry certs'),
      (cyber_analyst_id, 'bs_it', 'UMGC', 82, 'Strong security focus with NSA designation')
    ON CONFLICT (career_path_id, program_id, anchor_school) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- Verify Migration
-- =====================================================

-- Count mappings
DO $$
DECLARE
  mapping_count INT;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM career_path_programs;
  RAISE NOTICE 'Created % career-program mappings', mapping_count;
END $$;

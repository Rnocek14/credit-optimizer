-- =====================================================
-- V5 Career Foundation Migration - Fixed for existing table
-- Adds missing columns, creates career_path_programs, seeds data
-- =====================================================

-- ===================
-- 1. Add missing columns to career_paths
-- ===================
DO $$ 
BEGIN
  -- Add slug if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_paths' AND column_name = 'slug'
  ) THEN
    ALTER TABLE career_paths ADD COLUMN slug TEXT;
  END IF;
  
  -- Add baseline_salary if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_paths' AND column_name = 'baseline_salary'
  ) THEN
    ALTER TABLE career_paths ADD COLUMN baseline_salary INT;
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
    'Design, develop, and maintain software applications and systems.',
    95000,
    45000,
    'Technology'
  ),
  (
    'Data Analyst',
    'data-analyst',
    'Analyze complex datasets to derive actionable insights.',
    75000,
    42000,
    'Technology'
  ),
  (
    'Cybersecurity Analyst',
    'cybersecurity-analyst',
    'Protect organizational systems and data from cyber threats.',
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
  SELECT id INTO v_se_id FROM career_paths WHERE slug = 'software-engineer';
  SELECT id INTO v_da_id FROM career_paths WHERE slug = 'data-analyst';
  SELECT id INTO v_cs_id FROM career_paths WHERE slug = 'cybersecurity-analyst';

  -- Software Engineer mappings
  INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
  VALUES
    (v_se_id, 'bs_cs', 'TESU', 95, 'Top match: CS degree'),
    (v_se_id, 'bs_cs', 'WGU', 88, 'Competency-based'),
    (v_se_id, 'bs_cs', 'EXCU', 82, 'Affordable option'),
    (v_se_id, 'bs_it', 'TESU', 75, 'IT focus alternative');

  -- Data Analyst mappings
  INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
  VALUES
    (v_da_id, 'bs_it', 'TESU', 90, 'IT with data focus'),
    (v_da_id, 'bs_it', 'WGU', 85, 'Analytics emphasis'),
    (v_da_id, 'bs_ds', 'UMGC', 88, 'Data Science');

  -- Cybersecurity Analyst mappings
  INSERT INTO career_path_programs (career_path_id, program_id, anchor_school, strength, notes)
  VALUES
    (v_cs_id, 'bs_cybersec', 'WGU', 95, 'Dedicated cybersecurity'),
    (v_cs_id, 'bs_cybersec', 'UMGC', 90, 'NIST/NSA focus'),
    (v_cs_id, 'bs_it', 'TESU', 80, 'IT with security');
END $$;
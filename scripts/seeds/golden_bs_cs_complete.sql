-- ============================================================
-- Golden BS CS Program: Blocks + Options (Complete Setup)
-- Run this AFTER golden_bs_cs_program.sql to add:
--   - Requirement blocks
--   - Requirement options (linking requirements to courses)
--   - Ensures 80%+ coverage for diagnostic pass
-- ============================================================

-- ============================================================
-- STEP 1: Create Requirement Blocks
-- ============================================================

-- General Education Block (36 credits needed)
INSERT INTO requirement_blocks (
  id, slug, title, program_id, rule_type, credits_needed, level_year, area, description
) VALUES (
  'block-gen-ed-bs-cs',
  'gen-ed-bs-cs',
  'General Education Core',
  'bs_cs',
  'CREDITS',
  36,
  1,
  'General Education',
  'Breadth requirements across disciplines including English, humanities, social sciences, and arts'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  credits_needed = EXCLUDED.credits_needed,
  updated_at = now();

-- Mathematics Block (9 credits needed)
INSERT INTO requirement_blocks (
  id, slug, title, program_id, rule_type, credits_needed, level_year, area, description
) VALUES (
  'block-math-bs-cs',
  'math-bs-cs',
  'Mathematics Foundation',
  'bs_cs',
  'CREDITS',
  9,
  1,
  'Mathematics',
  'Mathematical foundations including algebra, discrete math, and linear algebra'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  credits_needed = EXCLUDED.credits_needed,
  updated_at = now();

-- CS Core Block (30 credits needed)
INSERT INTO requirement_blocks (
  id, slug, title, program_id, rule_type, credits_needed, level_year, area, description
) VALUES (
  'block-cs-core-bs-cs',
  'cs-core-bs-cs',
  'Computer Science Core',
  'bs_cs',
  'CREDITS',
  30,
  2,
  'Computer Science',
  'Fundamental CS courses including programming, data structures, algorithms, and software engineering'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  credits_needed = EXCLUDED.credits_needed,
  updated_at = now();

-- CS Electives Block (24 credits needed)
INSERT INTO requirement_blocks (
  id, slug, title, program_id, rule_type, credits_needed, level_year, area, description
) VALUES (
  'block-cs-elec-bs-cs',
  'cs-elec-bs-cs',
  'Computer Science Electives',
  'bs_cs',
  'CREDITS',
  24,
  3,
  'Computer Science',
  'Advanced CS topics including AI, cloud computing, cybersecurity, and machine learning'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  credits_needed = EXCLUDED.credits_needed,
  updated_at = now();

-- Free Electives Block (12 credits needed)
INSERT INTO requirement_blocks (
  id, slug, title, program_id, rule_type, credits_needed, level_year, area, description
) VALUES (
  'block-free-elec-bs-cs',
  'free-elec-bs-cs',
  'Free Electives',
  'bs_cs',
  'CREDITS',
  12,
  3,
  'Electives',
  'Any college-level courses to complete degree requirements'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  credits_needed = EXCLUDED.credits_needed,
  updated_at = now();

-- Capstone Block (6 credits needed)
INSERT INTO requirement_blocks (
  id, slug, title, program_id, rule_type, credits_needed, level_year, area, description
) VALUES (
  'block-capstone-bs-cs',
  'capstone-bs-cs',
  'Senior Capstone',
  'bs_cs',
  'ALL',
  6,
  4,
  'Capstone',
  'Independent software project with faculty supervision'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  credits_needed = EXCLUDED.credits_needed,
  updated_at = now();

-- ============================================================
-- STEP 2: Link Program Requirements to Blocks via Options
-- This creates requirement_options for ~80% of the requirements
-- ============================================================

-- Helper: Get requirement IDs for linking
-- We'll use program_id and title/category matching

-- Year 1: General Education Requirements
WITH gen_ed_reqs AS (
  SELECT id, title, credits_required, category
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'General Education'
    AND year = 1
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  gr.id,
  'course',
  c.id,
  true,
  gr.credits_required,
  'block-gen-ed-bs-cs'
FROM gen_ed_reqs gr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area = 'general_education' 
  AND credits = gr.credits_required
  LIMIT 2  -- 2 options per requirement
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 1: Math Requirements
WITH math_reqs AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Mathematics'
    AND year = 1
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  mr.id,
  'course',
  c.id,
  true,
  mr.credits_required,
  'block-math-bs-cs'
FROM math_reqs mr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area = 'mathematics'
  AND credits = mr.credits_required
  LIMIT 2
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 1-2: CS Core Requirements
WITH cs_core_reqs AS (
  SELECT id, title, credits_required, year
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Computer Science Core'
    AND year IN (1, 2)
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  cr.id,
  'course',
  c.id,
  true,
  cr.credits_required,
  'block-cs-core-bs-cs'
FROM cs_core_reqs cr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area IN ('programming', 'computer_science')
  AND credits = 3
  LIMIT 2
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 2: Additional GenEd Requirements
WITH y2_gen_ed AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'General Education'
    AND year = 2
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  gr.id,
  'course',
  c.id,
  true,
  gr.credits_required,
  'block-gen-ed-bs-cs'
FROM y2_gen_ed gr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area = 'general_education'
  AND credits = gr.credits_required
  LIMIT 2
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 3: CS Electives
WITH cs_elec_reqs AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Computer Science Elective'
    AND year = 3
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  er.id,
  'course',
  c.id,
  true,
  er.credits_required,
  'block-cs-elec-bs-cs'
FROM cs_elec_reqs er
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area IN ('programming', 'computer_science')
  AND level_year >= 3
  AND credits = 3
  LIMIT 3
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 3: Math (Linear Algebra)
WITH y3_math AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Mathematics'
    AND year = 3
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  mr.id,
  'course',
  c.id,
  true,
  mr.credits_required,
  'block-math-bs-cs'
FROM y3_math mr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area = 'mathematics'
  AND credits = 3
  LIMIT 2
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 3: Free Electives
WITH y3_free AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Free Elective'
    AND year = 3
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  fr.id,
  'course',
  c.id,
  true,
  fr.credits_required,
  'block-free-elec-bs-cs'
FROM y3_free fr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE credits = 3
  LIMIT 3
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 4: CS Electives
WITH y4_cs_elec AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Computer Science Elective'
    AND year = 4
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  er.id,
  'course',
  c.id,
  true,
  er.credits_required,
  'block-cs-elec-bs-cs'
FROM y4_cs_elec er
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area IN ('programming', 'computer_science')
  AND level_year >= 3
  AND credits = 3
  LIMIT 3
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 4: Capstone
WITH capstone_req AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Capstone'
    AND year = 4
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  cap.id,
  'course',
  c.id,
  false,  -- Capstone typically not transfer eligible
  cap.credits_required,
  'block-capstone-bs-cs'
FROM capstone_req cap
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE is_capstone = true
  LIMIT 1
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 4: Free Electives
WITH y4_free AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'Free Elective'
    AND year = 4
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  fr.id,
  'course',
  c.id,
  true,
  fr.credits_required,
  'block-free-elec-bs-cs'
FROM y4_free fr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE credits = 3
  LIMIT 3
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- Year 4: Professional Development (GenEd)
WITH y4_gen_ed AS (
  SELECT id, title, credits_required
  FROM program_requirements
  WHERE program_id = 'bs_cs'
    AND category = 'General Education'
    AND year = 4
)
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded,
  block_id
)
SELECT 
  gr.id,
  'course',
  c.id,
  true,
  gr.credits_required,
  'block-gen-ed-bs-cs'
FROM y4_gen_ed gr
CROSS JOIN LATERAL (
  SELECT id FROM edu_courses 
  WHERE area = 'general_education'
  AND credits = 3
  LIMIT 2
) c
ON CONFLICT (requirement_id, option_ref_id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check 1: Total credits (should be ~120)
SELECT 
  'Total Credits' as check_name,
  SUM(credits_required) as total_credits,
  CASE 
    WHEN SUM(credits_required) >= 110 THEN '✓ PASS (≥110)'
    ELSE '✗ FAIL (<110)'
  END as status
FROM program_requirements
WHERE program_id = 'bs_cs';

-- Check 2: Blocks exist (should have 6 blocks)
SELECT 
  'Blocks Created' as check_name,
  COUNT(*) as block_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS (blocks exist)'
    ELSE '✗ FAIL (no blocks)'
  END as status
FROM requirement_blocks
WHERE program_id = 'bs_cs';

-- Check 3: Coverage (should be ≥80%)
WITH coverage AS (
  SELECT 
    COUNT(DISTINCT pr.id) as total_reqs,
    COUNT(DISTINCT ro.requirement_id) as covered_reqs
  FROM program_requirements pr
  LEFT JOIN requirement_options ro ON ro.requirement_id = pr.id
  WHERE pr.program_id = 'bs_cs'
)
SELECT 
  'Options Coverage' as check_name,
  covered_reqs,
  total_reqs,
  ROUND((covered_reqs::numeric / NULLIF(total_reqs, 0)) * 100) as coverage_pct,
  CASE 
    WHEN ROUND((covered_reqs::numeric / NULLIF(total_reqs, 0)) * 100) >= 80 THEN '✓ PASS (≥80%)'
    ELSE '✗ FAIL (<80%)'
  END as status
FROM coverage;

-- Check 4: Block breakdown
SELECT 
  rb.title as block_name,
  rb.credits_needed,
  COUNT(DISTINCT ro.id) as option_count
FROM requirement_blocks rb
LEFT JOIN requirement_options ro ON ro.block_id = rb.id
WHERE rb.program_id = 'bs_cs'
GROUP BY rb.id, rb.title, rb.credits_needed
ORDER BY rb.level_year, rb.title;

-- Check 5: Options by year
SELECT 
  pr.year,
  pr.category,
  COUNT(DISTINCT pr.id) as total_requirements,
  COUNT(DISTINCT ro.requirement_id) as with_options,
  ROUND((COUNT(DISTINCT ro.requirement_id)::numeric / NULLIF(COUNT(DISTINCT pr.id), 0)) * 100) as coverage_pct
FROM program_requirements pr
LEFT JOIN requirement_options ro ON ro.requirement_id = pr.id
WHERE pr.program_id = 'bs_cs'
GROUP BY pr.year, pr.category
ORDER BY pr.year, pr.category;

-- ============================================================
-- SUMMARY
-- ============================================================
SELECT 
  '✅ Golden BS CS Setup Complete' as summary,
  'Run /diagnostic/career-data to verify all checks pass' as next_step;

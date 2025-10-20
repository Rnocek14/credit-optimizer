-- ============================================================================
-- Populate Years 3 & 4 Requirements and Fix Credits (IDEMPOTENT)
-- ============================================================================
-- This script is safe to run multiple times. It will:
-- 1. Audit current state
-- 2. Seed missing sample courses
-- 3. Add missing program requirements for Years 3 and 4
-- 4. Fix credits_required for all requirements
-- 5. Link courses to requirements
-- ============================================================================

-- ============================================================================
-- STEP 0: AUDIT CURRENT STATE
-- ============================================================================
-- View requirements by year (before changes)
SELECT 
  year,
  COUNT(*) as req_count,
  SUM(credits_required) as total_credits
FROM program_requirements
WHERE program_id = (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1)
GROUP BY year
ORDER BY year;

-- View all requirements with credits
SELECT 
  year,
  category,
  name,
  credits_required,
  id
FROM program_requirements
WHERE program_id = (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1)
ORDER BY year, category, name;

-- ============================================================================
-- STEP 1: SEED SAMPLE COURSES (if missing)
-- ============================================================================
-- Ensure we have base courses for Years 3 & 4
INSERT INTO edu_courses (code, title, credits, level_year, is_core)
SELECT c.code, c.title, c.credits::integer, c.level_year::integer, c.is_core::boolean
FROM (VALUES
  ('CS301', 'Advanced Algorithms', '3', '3', 'true'),
  ('CS302', 'Algorithm Analysis', '3', '3', 'true'),
  ('CS303', 'Database Systems', '3', '3', 'true'),
  ('DS301', 'Database Design', '3', '3', 'false'),
  ('SE301', 'Software Engineering I', '3', '3', 'true'),
  ('SE302', 'Software Engineering II', '3', '3', 'false'),
  ('CS401', 'Distributed Systems', '3', '4', 'false'),
  ('CS402', 'Machine Learning', '3', '4', 'false'),
  ('CS403', 'Computer Security', '3', '4', 'false'),
  ('DS401', 'Big Data Analytics', '3', '4', 'false'),
  ('SE401', 'Software Architecture', '3', '4', 'false'),
  ('CS499', 'Senior Capstone Project', '6', '4', 'true')
) AS c(code, title, credits, level_year, is_core)
WHERE NOT EXISTS (
  SELECT 1 FROM edu_courses ec WHERE ec.code = c.code
);

-- ============================================================================
-- STEP 2: FIX EXISTING REQUIREMENTS (Years 1 & 2)
-- ============================================================================
-- Set nonzero credits for existing requirements
UPDATE program_requirements
SET credits_required = 6
WHERE program_id = (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1)
  AND year IN (1, 2)
  AND (credits_required IS NULL OR credits_required = 0);

-- ============================================================================
-- STEP 3: ADD YEAR 3 REQUIREMENTS (idempotent)
-- ============================================================================
DO $$
DECLARE
  prog_id UUID;
BEGIN
  -- Get program ID
  SELECT id INTO prog_id FROM programs WHERE code = 'BS_CS' LIMIT 1;
  
  -- Year 3 Core Requirements
  INSERT INTO program_requirements (
    program_id, year, category, name, description, credits_required, min_select, max_select
  )
  SELECT prog_id, r.year, r.category, r.name, r.description, r.credits_required, r.min_select, r.max_select
  FROM (VALUES
    (3, 'core', 'Advanced Algorithms', 'Advanced algorithmic techniques and analysis', 3, 1, 1),
    (3, 'core', 'Database Systems', 'Database design, SQL, and NoSQL systems', 3, 1, 1),
    (3, 'core', 'Software Engineering Principles', 'Design patterns, testing, and software architecture', 3, 1, 1),
    (3, 'elective', 'Technical Elective I', 'Choose from advanced CS topics', 3, 1, NULL),
    (3, 'elective', 'Technical Elective II', 'Choose from advanced CS topics', 3, 1, NULL)
  ) AS r(year, category, name, description, credits_required, min_select, max_select)
  WHERE NOT EXISTS (
    SELECT 1 FROM program_requirements pr
    WHERE pr.program_id = prog_id AND pr.name = r.name
  );
END $$;

-- ============================================================================
-- STEP 4: ADD YEAR 4 REQUIREMENTS (idempotent)
-- ============================================================================
DO $$
DECLARE
  prog_id UUID;
BEGIN
  -- Get program ID
  SELECT id INTO prog_id FROM programs WHERE code = 'BS_CS' LIMIT 1;
  
  -- Year 4 Requirements
  INSERT INTO program_requirements (
    program_id, year, category, name, description, credits_required, min_select, max_select
  )
  SELECT prog_id, r.year, r.category, r.name, r.description, r.credits_required, r.min_select, r.max_select
  FROM (VALUES
    (4, 'capstone', 'Senior Capstone Project', 'Culminating project demonstrating mastery', 6, 1, 1),
    (4, 'elective', 'Advanced Elective I', 'Choose from 400-level courses', 3, 1, NULL),
    (4, 'elective', 'Advanced Elective II', 'Choose from 400-level courses', 3, 1, NULL),
    (4, 'elective', 'Advanced Elective III', 'Choose from 400-level courses', 3, 1, NULL)
  ) AS r(year, category, name, description, credits_required, min_select, max_select)
  WHERE NOT EXISTS (
    SELECT 1 FROM program_requirements pr
    WHERE pr.program_id = prog_id AND pr.name = r.name
  );
END $$;

-- ============================================================================
-- STEP 5: LINK COURSES TO REQUIREMENTS (idempotent)
-- ============================================================================

-- Link Advanced Algorithms → CS301, CS302
INSERT INTO requirement_options (
  requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded
)
SELECT 
  pr.id,
  'course',
  ec.id,
  true,
  ec.credits
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.name = 'Advanced Algorithms'
  AND pr.year = 3
  AND ec.code IN ('CS301', 'CS302')
  AND NOT EXISTS (
    SELECT 1 FROM requirement_options ro
    WHERE ro.requirement_id = pr.id AND ro.option_ref_id = ec.id
  );

-- Link Database Systems → CS303, DS301
INSERT INTO requirement_options (
  requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded
)
SELECT 
  pr.id,
  'course',
  ec.id,
  true,
  ec.credits
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.name = 'Database Systems'
  AND pr.year = 3
  AND ec.code IN ('CS303', 'DS301')
  AND NOT EXISTS (
    SELECT 1 FROM requirement_options ro
    WHERE ro.requirement_id = pr.id AND ro.option_ref_id = ec.id
  );

-- Link Software Engineering Principles → SE301, SE302
INSERT INTO requirement_options (
  requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded
)
SELECT 
  pr.id,
  'course',
  ec.id,
  true,
  ec.credits
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.name = 'Software Engineering Principles'
  AND pr.year = 3
  AND ec.code IN ('SE301', 'SE302')
  AND NOT EXISTS (
    SELECT 1 FROM requirement_options ro
    WHERE ro.requirement_id = pr.id AND ro.option_ref_id = ec.id
  );

-- Link Technical Electives (Year 3) → Advanced 300-level courses
INSERT INTO requirement_options (
  requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded
)
SELECT DISTINCT
  pr.id,
  'course',
  ec.id,
  true,
  ec.credits
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.category = 'elective'
  AND pr.year = 3
  AND (ec.code LIKE 'CS3%' OR ec.code LIKE 'DS3%' OR ec.code LIKE 'SE3%')
  AND NOT EXISTS (
    SELECT 1 FROM requirement_options ro
    WHERE ro.requirement_id = pr.id AND ro.option_ref_id = ec.id
  );

-- Link Senior Capstone → CS499
INSERT INTO requirement_options (
  requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded
)
SELECT 
  pr.id,
  'course',
  ec.id,
  false,
  ec.credits
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.category = 'capstone'
  AND pr.year = 4
  AND ec.code = 'CS499'
  AND NOT EXISTS (
    SELECT 1 FROM requirement_options ro
    WHERE ro.requirement_id = pr.id AND ro.option_ref_id = ec.id
  );

-- Link Advanced Electives (Year 4) → 400-level courses
INSERT INTO requirement_options (
  requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded
)
SELECT DISTINCT
  pr.id,
  'course',
  ec.id,
  true,
  ec.credits
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.category = 'elective'
  AND pr.year = 4
  AND (ec.code LIKE 'CS4%' OR ec.code LIKE 'DS4%' OR ec.code LIKE 'SE4%')
  AND NOT EXISTS (
    SELECT 1 FROM requirement_options ro
    WHERE ro.requirement_id = pr.id AND ro.option_ref_id = ec.id
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all requirements by year
SELECT 
  year,
  category,
  name,
  credits_required,
  min_select,
  max_select,
  id
FROM program_requirements
ORDER BY year, category, name;

-- Count requirements per year
SELECT 
  year,
  COUNT(*) as requirement_count,
  SUM(credits_required) as total_credits
FROM program_requirements
GROUP BY year
ORDER BY year;

-- Show requirements with their option counts
SELECT 
  pr.year,
  pr.category,
  pr.name,
  pr.credits_required,
  COUNT(DISTINCT ro.id) as option_count
FROM program_requirements pr
LEFT JOIN requirement_options ro ON ro.requirement_id = pr.id
GROUP BY pr.id, pr.year, pr.category, pr.name, pr.credits_required
ORDER BY pr.year, pr.category, pr.name;

-- Show some sample options for Year 3 & 4
SELECT 
  pr.year,
  pr.name as requirement_name,
  ec.code as course_code,
  ec.title as course_title,
  ro.credits_awarded
FROM program_requirements pr
JOIN requirement_options ro ON ro.requirement_id = pr.id
JOIN edu_courses ec ON ec.id = ro.option_ref_id
WHERE pr.year IN (3, 4)
ORDER BY pr.year, pr.name, ec.code
LIMIT 20;

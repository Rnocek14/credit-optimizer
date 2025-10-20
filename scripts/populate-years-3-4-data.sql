-- ============================================================================
-- Populate Years 3 & 4 Requirements and Fix Credits
-- ============================================================================
-- This script adds missing program requirements for Years 3 and 4,
-- fixes credits_required for existing requirements, and links courses.
-- ============================================================================

-- STEP 1: Fix existing requirements (Years 1 & 2) to have correct credits
-- ============================================================================
UPDATE program_requirements
SET credits_required = 6
WHERE credits_required = 0
  AND year IN (1, 2);

-- Verify the update
SELECT 
  year,
  category,
  name,
  credits_required,
  id
FROM program_requirements
WHERE year IN (1, 2)
ORDER BY year, category;

-- STEP 2: Add Year 3 Requirements
-- ============================================================================

-- Year 3 - Core Course (Software Engineering Track)
INSERT INTO program_requirements (
  program_id,
  year,
  category,
  name,
  description,
  credits_required,
  min_select,
  max_select
)
VALUES 
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    3,
    'core',
    'Advanced Algorithms',
    'Advanced algorithmic techniques and analysis',
    3,
    1,
    1
  ),
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    3,
    'core',
    'Database Systems',
    'Database design, SQL, and NoSQL systems',
    3,
    1,
    1
  ),
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    3,
    'core',
    'Software Engineering Principles',
    'Design patterns, testing, and software architecture',
    3,
    1,
    1
  );

-- Year 3 - Electives
INSERT INTO program_requirements (
  program_id,
  year,
  category,
  name,
  description,
  credits_required,
  min_select,
  max_select
)
VALUES 
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    3,
    'elective',
    'Technical Elective I',
    'Choose from advanced CS topics',
    3,
    1,
    NULL
  ),
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    3,
    'elective',
    'Technical Elective II',
    'Choose from advanced CS topics',
    3,
    1,
    NULL
  );

-- STEP 3: Add Year 4 Requirements
-- ============================================================================

-- Year 4 - Capstone
INSERT INTO program_requirements (
  program_id,
  year,
  category,
  name,
  description,
  credits_required,
  min_select,
  max_select
)
VALUES 
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    4,
    'capstone',
    'Senior Capstone Project',
    'Culminating project demonstrating mastery',
    6,
    1,
    1
  );

-- Year 4 - Advanced Electives
INSERT INTO program_requirements (
  program_id,
  year,
  category,
  name,
  description,
  credits_required,
  min_select,
  max_select
)
VALUES 
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    4,
    'elective',
    'Advanced Elective I',
    'Choose from 400-level courses',
    3,
    1,
    NULL
  ),
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    4,
    'elective',
    'Advanced Elective II',
    'Choose from 400-level courses',
    3,
    1,
    NULL
  ),
  (
    (SELECT id FROM programs WHERE code = 'BS_CS' LIMIT 1),
    4,
    'elective',
    'Advanced Elective III',
    'Choose from 400-level courses',
    3,
    1,
    NULL
  );

-- STEP 4: Link Courses to Year 3 Requirements
-- ============================================================================

-- Advanced Algorithms → CS301, CS302
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded
)
SELECT 
  pr.id as requirement_id,
  'course' as option_kind,
  ec.id as option_ref_id,
  true as transfer_eligible,
  ec.credits as credits_awarded
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.name = 'Advanced Algorithms'
  AND pr.year = 3
  AND ec.code IN ('CS301', 'CS302')
ON CONFLICT DO NOTHING;

-- Database Systems → CS303, DS301
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded
)
SELECT 
  pr.id as requirement_id,
  'course' as option_kind,
  ec.id as option_ref_id,
  true as transfer_eligible,
  ec.credits as credits_awarded
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.name = 'Database Systems'
  AND pr.year = 3
  AND ec.code IN ('CS303', 'DS301')
ON CONFLICT DO NOTHING;

-- Software Engineering Principles → SE301, SE302
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded
)
SELECT 
  pr.id as requirement_id,
  'course' as option_kind,
  ec.id as option_ref_id,
  true as transfer_eligible,
  ec.credits as credits_awarded
FROM program_requirements pr
CROSS JOIN edu_courses ec
WHERE pr.name = 'Software Engineering Principles'
  AND pr.year = 3
  AND ec.code LIKE 'SE3%'
  AND ec.code IN ('SE301', 'SE302')
ON CONFLICT DO NOTHING;

-- Technical Electives (Year 3) → Advanced CS/DS/SE courses
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded
)
SELECT 
  pr.id as requirement_id,
  'course' as option_kind,
  ec.id as option_ref_id,
  true as transfer_eligible,
  ec.credits as credits_awarded
FROM program_requirements pr
CROSS JOIN LATERAL (
  SELECT id, credits
  FROM edu_courses
  WHERE code LIKE 'CS3%' OR code LIKE 'DS3%' OR code LIKE 'SE3%'
  ORDER BY code
  LIMIT 5
) ec
WHERE pr.category = 'elective'
  AND pr.year = 3
ON CONFLICT DO NOTHING;

-- STEP 5: Link Courses to Year 4 Requirements
-- ============================================================================

-- Capstone → CS499 (create if doesn't exist)
DO $$
DECLARE
  capstone_course_id UUID;
BEGIN
  -- Try to find existing capstone course
  SELECT id INTO capstone_course_id
  FROM edu_courses
  WHERE code = 'CS499'
  LIMIT 1;
  
  -- If not found, create it
  IF capstone_course_id IS NULL THEN
    INSERT INTO edu_courses (code, title, credits, level_year, is_capstone, is_core)
    VALUES ('CS499', 'Senior Capstone Project', 6, 4, true, true)
    RETURNING id INTO capstone_course_id;
  END IF;
  
  -- Link to capstone requirement
  INSERT INTO requirement_options (
    requirement_id,
    option_kind,
    option_ref_id,
    transfer_eligible,
    credits_awarded
  )
  SELECT 
    pr.id,
    'course',
    capstone_course_id,
    false,
    6
  FROM program_requirements pr
  WHERE pr.category = 'capstone' AND pr.year = 4
  ON CONFLICT DO NOTHING;
END $$;

-- Advanced Electives (Year 4) → 400-level courses
INSERT INTO requirement_options (
  requirement_id,
  option_kind,
  option_ref_id,
  transfer_eligible,
  credits_awarded
)
SELECT 
  pr.id as requirement_id,
  'course' as option_kind,
  ec.id as option_ref_id,
  true as transfer_eligible,
  ec.credits as credits_awarded
FROM program_requirements pr
CROSS JOIN LATERAL (
  SELECT id, credits
  FROM edu_courses
  WHERE code LIKE 'CS4%' OR code LIKE 'DS4%' OR code LIKE 'SE4%'
  ORDER BY code
  LIMIT 6
) ec
WHERE pr.category = 'elective'
  AND pr.year = 4
ON CONFLICT DO NOTHING;

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

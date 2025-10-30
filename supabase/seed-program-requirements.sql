-- ============================================================================
-- Seed: Program Requirements + Requirement Options for BS CS
-- ============================================================================
-- This populates the database with a complete 4-year BS CS degree structure
-- and links each requirement to available marketplace course options.
--
-- Schema assumptions:
--   • program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
--   • requirement_options (id, requirement_id, option_kind, option_ref_id, credits_awarded)
--   • marketplace_courses (id, canonical_course_id, ...)
--   • edu_courses (id, code, title, credits, ...)

-- ============================================================================
-- YEAR 1: Foundation (General Education + Intro CS + Math)
-- ============================================================================

-- Year 1 - Programming Fundamentals I
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y1_prog1',
  'bs_cs',
  1,
  'year-1-programming-i',
  'Programming Fundamentals I',
  'Introduction to programming concepts and problem-solving',
  3,
  'required',
  1
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Link to marketplace options
INSERT INTO requirement_options (requirement_id, option_kind, option_ref_id, credits_awarded)
VALUES
  ('req_y1_prog1', 'course', 'mk_cs101_sophia', 3),
  ('req_y1_prog1', 'course', 'mk_cs101_study', 3)
ON CONFLICT DO NOTHING;

-- Year 1 - College Algebra
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y1_algebra',
  'bs_cs',
  1,
  'year-1-college-algebra',
  'College Algebra',
  'Fundamental algebra for computer science',
  3,
  'required',
  1
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

INSERT INTO requirement_options (requirement_id, option_kind, option_ref_id, credits_awarded)
VALUES
  ('req_y1_algebra', 'course', 'mk_alg_sophia', 3),
  ('req_y1_algebra', 'course', 'mk_alg_univx', 3)
ON CONFLICT DO NOTHING;

-- Year 1 - English Composition
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y1_english',
  'bs_cs',
  1,
  'year-1-english-comp',
  'English Composition',
  'Written communication fundamentals',
  3,
  'required',
  1
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 1 - Introduction to Computer Science
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y1_cs_intro',
  'bs_cs',
  1,
  'year-1-cs-intro',
  'Introduction to Computer Science',
  'Overview of computer science field and concepts',
  3,
  'required',
  1
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 1 - Humanities Elective
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y1_humanities',
  'bs_cs',
  1,
  'year-1-humanities',
  'Humanities Elective',
  'Choose from approved humanities courses',
  3,
  'elective',
  1
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- ============================================================================
-- YEAR 2: Core CS + Math + Sciences
-- ============================================================================

-- Year 2 - Data Structures
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y2_data_structures',
  'bs_cs',
  2,
  'year-2-data-structures',
  'Data Structures',
  'Fundamental data structures and algorithms',
  3,
  'required',
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 2 - Calculus I
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y2_calculus',
  'bs_cs',
  2,
  'year-2-calculus',
  'Calculus I',
  'Introduction to differential and integral calculus',
  4,
  'required',
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 2 - Discrete Mathematics
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y2_discrete',
  'bs_cs',
  2,
  'year-2-discrete-math',
  'Discrete Mathematics',
  'Mathematical foundations for CS',
  3,
  'required',
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 2 - Object-Oriented Programming
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y2_oop',
  'bs_cs',
  2,
  'year-2-oop',
  'Object-Oriented Programming',
  'Advanced programming with OOP paradigms',
  3,
  'required',
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 2 - Physics or Chemistry
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y2_science',
  'bs_cs',
  2,
  'year-2-natural-science',
  'Natural Science',
  'Choose from Physics, Chemistry, or Biology',
  4,
  'elective',
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 2 - Social Science Elective
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y2_social',
  'bs_cs',
  2,
  'year-2-social-science',
  'Social Science Elective',
  'Choose from approved social science courses',
  3,
  'elective',
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- ============================================================================
-- YEAR 3: Advanced CS + Specialization
-- ============================================================================

-- Year 3 - Algorithms
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y3_algorithms',
  'bs_cs',
  3,
  'year-3-algorithms',
  'Algorithms',
  'Design and analysis of algorithms',
  3,
  'required',
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 3 - Database Systems
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y3_databases',
  'bs_cs',
  3,
  'year-3-databases',
  'Database Systems',
  'Database design, SQL, and database management',
  3,
  'required',
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 3 - Operating Systems
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y3_os',
  'bs_cs',
  3,
  'year-3-operating-systems',
  'Operating Systems',
  'OS concepts, processes, memory, file systems',
  3,
  'required',
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 3 - Computer Networks
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y3_networks',
  'bs_cs',
  3,
  'year-3-networks',
  'Computer Networks',
  'Network protocols, architecture, and security',
  3,
  'required',
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 3 - Statistics
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y3_stats',
  'bs_cs',
  3,
  'year-3-statistics',
  'Statistics',
  'Probability and statistical methods',
  3,
  'required',
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 3 - CS Elective 1
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y3_elective1',
  'bs_cs',
  3,
  'year-3-cs-elective-1',
  'CS Elective I',
  'Choose from approved upper-level CS courses',
  3,
  'elective',
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- ============================================================================
-- YEAR 4: Capstone + Advanced Electives
-- ============================================================================

-- Year 4 - Software Engineering
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y4_software_eng',
  'bs_cs',
  4,
  'year-4-software-engineering',
  'Software Engineering',
  'Software development lifecycle and methodologies',
  3,
  'required',
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 4 - Capstone Project
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y4_capstone',
  'bs_cs',
  4,
  'year-4-capstone',
  'Senior Capstone Project',
  'Culminating project demonstrating CS competency',
  3,
  'required',
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 4 - CS Elective 2
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y4_elective2',
  'bs_cs',
  4,
  'year-4-cs-elective-2',
  'CS Elective II',
  'Advanced CS elective (AI, Security, Graphics, etc.)',
  3,
  'elective',
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 4 - CS Elective 3
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y4_elective3',
  'bs_cs',
  4,
  'year-4-cs-elective-3',
  'CS Elective III',
  'Advanced CS elective',
  3,
  'elective',
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 4 - Free Elective 1
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y4_free1',
  'bs_cs',
  4,
  'year-4-free-elective-1',
  'Free Elective I',
  'Any approved course',
  3,
  'elective',
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- Year 4 - Free Elective 2
INSERT INTO program_requirements (id, program_id, year, slug, name, description, credits_required, requirement_type, level_year)
VALUES (
  'req_y4_free2',
  'bs_cs',
  4,
  'year-4-free-elective-2',
  'Free Elective II',
  'Any approved course',
  3,
  'elective',
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits_required = EXCLUDED.credits_required;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count requirements by year
SELECT year, requirement_type, count(*) as count, sum(credits_required) as total_credits
FROM program_requirements
WHERE program_id = 'bs_cs'
GROUP BY year, requirement_type
ORDER BY year, requirement_type;

-- Count options per requirement
SELECT r.year, r.name, count(ro.id) as option_count
FROM program_requirements r
LEFT JOIN requirement_options ro ON ro.requirement_id = r.id
WHERE r.program_id = 'bs_cs'
GROUP BY r.year, r.name
ORDER BY r.year, option_count DESC;

-- Total degree credits
SELECT sum(credits_required) as total_degree_credits
FROM program_requirements
WHERE program_id = 'bs_cs';

-- Sample requirements with marketplace options
SELECT 
  r.year,
  r.name as requirement_name,
  mc.title as marketplace_option,
  mc.cost_usd,
  mc.duration_weeks,
  mp.name as provider
FROM program_requirements r
JOIN requirement_options ro ON ro.requirement_id = r.id
LEFT JOIN marketplace_courses mc ON mc.id = ro.option_ref_id
LEFT JOIN marketplace_providers mp ON mp.id = mc.provider_id
WHERE r.program_id = 'bs_cs'
ORDER BY r.year, r.name
LIMIT 20;

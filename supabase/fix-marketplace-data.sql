-- Fix: Create marketplace_courses entries using existing edu_course IDs
-- This allows existing requirement_options to work immediately

-- First, insert providers if they don't exist
INSERT INTO providers (id, name, type, accreditation, country, website_url, active, provider_code)
VALUES
  ('prov_sophia', 'Sophia Learning', 'mooc', 'ACE Approved', 'US', 'https://sophia.org', true, 'SOPHIA'),
  ('prov_study', 'Study.com', 'mooc', 'ACE Approved', 'US', 'https://study.com', true, 'STUDY'),
  ('prov_coursera', 'Coursera', 'mooc', 'Accredited', 'US', 'https://coursera.org', true, 'COURSERA'),
  ('prov_clep', 'CLEP', 'testing_center', 'College Board', 'US', 'https://clep.collegeboard.org', true, 'CLEP')
ON CONFLICT (id) DO NOTHING;

-- Create marketplace_courses with the SAME IDs as edu_courses
-- This way existing requirement_options will find them

-- CS-101: Programming Fundamentals I
INSERT INTO marketplace_courses (
  id, code, title, description, credits, level, modality, 
  duration_weeks, cost_usd, skill_tags, provider_id, active, cri_score
)
VALUES
  (
    'd25639ab-f98e-4a18-9a48-69acf6c29a27',
    'CS-101', 
    'Programming Fundamentals I',
    'Introduction to programming using Python',
    3, 100, 'online', 6, 89,
    ARRAY['python', 'programming'],
    'prov_sophia',
    true,
    75
  )
ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id,
  cri_score = EXCLUDED.cri_score;

-- CS-102: Programming Fundamentals II  
INSERT INTO marketplace_courses (
  id, code, title, description, credits, level, modality,
  duration_weeks, cost_usd, skill_tags, provider_id, active, cri_score
)
VALUES
  (
    'e2465426-e0cb-4678-920d-1861b8ca4ba4',
    'CS-102',
    'Programming Fundamentals II', 
    'Advanced programming with data structures',
    3, 100, 'online', 8, 199,
    ARRAY['python', 'data-structures'],
    'prov_coursera',
    true,
    82
  )
ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id,
  cri_score = EXCLUDED.cri_score;

-- MATH-110: College Algebra
INSERT INTO marketplace_courses (
  id, code, title, description, credits, level, modality,
  duration_weeks, cost_usd, skill_tags, provider_id, active, cri_score
)
VALUES
  (
    '6f238b4f-0090-424e-8a9c-948f7f50f4dc',
    'MATH-110',
    'College Algebra',
    'Foundational algebra course',
    3, 100, 'online', 4, 59,
    ARRAY['algebra', 'mathematics'],
    'prov_sophia',
    true,
    70
  )
ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id,
  cri_score = EXCLUDED.cri_score;

-- MATH-141: Calculus I
INSERT INTO marketplace_courses (
  id, code, title, description, credits, level, modality,
  duration_weeks, cost_usd, skill_tags, provider_id, active, cri_score
)
VALUES
  (
    '76d4ed47-b3e5-4adf-8a7a-6ebbc5a5bcec',
    'MATH-141',
    'Calculus I',
    'Single-variable calculus',
    4, 200, 'online', 12, 249,
    ARRAY['calculus', 'mathematics'],
    'prov_coursera',
    true,
    85
  )
ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id,
  cri_score = EXCLUDED.cri_score;

-- MATH-111: College Algebra II
INSERT INTO marketplace_courses (
  id, code, title, description, credits, level, modality,
  duration_weeks, cost_usd, skill_tags, provider_id, active, cri_score
)
VALUES
  (
    'cf623367-3650-45e5-916e-1f14b87abda7',
    'MATH-111',
    'College Algebra II',
    'Advanced algebra topics',
    3, 200, 'online', 6, 89,
    ARRAY['algebra', 'mathematics'],
    'prov_study',
    true,
    72
  )
ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id,
  cri_score = EXCLUDED.cri_score;

-- MATH-120: Statistics
INSERT INTO marketplace_courses (
  id, code, title, description, credits, level, modality,
  duration_weeks, cost_usd, skill_tags, provider_id, active, cri_score
)
VALUES
  (
    '3d8a8b85-a084-4fbb-8670-d8d11187a2a6',
    'MATH-120',
    'Statistics',
    'Introduction to statistical methods',
    3, 200, 'online', 8, 249,
    ARRAY['statistics', 'data-analysis'],
    'prov_coursera',
    true,
    80
  )
ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id,
  cri_score = EXCLUDED.cri_score;

-- Verify the data
SELECT 
  mc.code,
  mc.title,
  mc.cost_usd,
  mc.duration_weeks,
  mc.cri_score,
  p.name as provider_name
FROM marketplace_courses mc
LEFT JOIN providers p ON mc.provider_id = p.id
WHERE mc.id IN (
  'd25639ab-f98e-4a18-9a48-69acf6c29a27',
  'e2465426-e0cb-4678-920d-1861b8ca4ba4',
  '6f238b4f-0090-424e-8a9c-948f7f50f4dc',
  '76d4ed47-b3e5-4adf-8a7a-6ebbc5a5bcec',
  'cf623367-3650-45e5-916e-1f14b87abda7',
  '3d8a8b85-a084-4fbb-8670-d8d11187a2a6'
)
ORDER BY mc.code;

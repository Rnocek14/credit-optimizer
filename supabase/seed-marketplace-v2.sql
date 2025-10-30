-- ============================================
-- Step 2: Marketplace Data Seed (Real Data)
-- Run in Supabase SQL Editor to populate marketplace
-- ============================================

-- 1. Insert Providers (idempotent)
INSERT INTO providers (id, name, type, accreditation, country, website_url, active, provider_code)
VALUES
  ('prov_sophia', 'Sophia Learning', 'mooc', 'ACE Approved', 'US', 'https://sophia.org', true, 'SOPHIA'),
  ('prov_study', 'Study.com', 'mooc', 'ACE Approved', 'US', 'https://study.com', true, 'STUDY'),
  ('prov_straighterline', 'Straighterline', 'mooc', 'ACE Approved', 'US', 'https://straighterline.com', true, 'SL'),
  ('prov_clep', 'CLEP', 'testing_center', 'College Board', 'US', 'https://clep.collegeboard.org', true, 'CLEP'),
  ('prov_coursera', 'Coursera', 'mooc', 'Accredited', 'US', 'https://coursera.org', true, 'COURSERA'),
  ('prov_edx', 'edX', 'mooc', 'Accredited', 'US', 'https://edx.org', true, 'EDX'),
  ('prov_univx', 'University X', 'university', 'Regional', 'US', 'https://example.edu', true, 'UNIVX')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  website_url = EXCLUDED.website_url;

-- 2. Insert Marketplace Courses
-- Note: Match canonical_course_id to your edu_courses codes (CS-101, MATH-110, etc.)
-- Adjust IDs/codes based on your actual schema

INSERT INTO marketplace_courses (
  id,
  code,
  title,
  description,
  credits,
  level,
  modality,
  duration_weeks,
  cost_usd,
  skill_tags,
  provider_id,
  active
)
VALUES
  -- Programming Fundamentals I alternatives
  ('mk_cs101_sophia', 'CS-101-SOPHIA', 'Programming Fundamentals I (Sophia)', 
   'Self-paced intro to Python programming', 3, 100, 'online', 6, 89, 
   ARRAY['python', 'programming'], 'prov_sophia', true),
  
  ('mk_cs101_study', 'CS-101-STUDY', 'Programming Fundamentals I (Study.com)', 
   'Video-based intro to programming', 3, 100, 'online', 6, 199, 
   ARRAY['python', 'programming'], 'prov_study', true),
  
  ('mk_cs101_sl', 'CS-101-SL', 'Computer Programming I (Straighterline)', 
   'Fast-paced programming fundamentals', 3, 100, 'online', 4, 99, 
   ARRAY['programming', 'java'], 'prov_straighterline', true),

  -- College Algebra alternatives
  ('mk_alg_sophia', 'MATH-110-SOPHIA', 'College Algebra (Sophia)', 
   'Self-paced algebra fundamentals', 3, 100, 'online', 4, 59, 
   ARRAY['algebra', 'mathematics'], 'prov_sophia', true),
  
  ('mk_alg_clep', 'MATH-110-CLEP', 'College Algebra CLEP', 
   'Proctored exam for algebra credit', 3, 100, 'in_person', 1, 89, 
   ARRAY['algebra', 'exam'], 'prov_clep', true),
  
  ('mk_alg_univx', 'MATH-110-UNIVX', 'College Algebra (UnivX)', 
   'Traditional university algebra course', 3, 100, 'online', 12, 900, 
   ARRAY['algebra', 'mathematics'], 'prov_univx', true),

  -- Data Structures alternatives
  ('mk_cs201_coursera', 'CS-201-COURSERA', 'Data Structures (Coursera)', 
   'Advanced data structures and algorithms', 3, 200, 'online', 10, 249, 
   ARRAY['data-structures', 'algorithms'], 'prov_coursera', true),
  
  ('mk_cs201_edx', 'CS-201-EDX', 'Data Structures & Algorithms (edX)', 
   'Comprehensive DS&A course', 3, 200, 'online', 12, 199, 
   ARRAY['data-structures', 'algorithms'], 'prov_edx', true),
  
  ('mk_cs201_univx', 'CS-201-UNIVX', 'Data Structures (UnivX)', 
   'University data structures course', 3, 200, 'online', 15, 1200, 
   ARRAY['data-structures', 'java'], 'prov_univx', true),

  -- Calculus I alternatives
  ('mk_calc_sophia', 'MATH-241-SOPHIA', 'Calculus I (Sophia)', 
   'Self-paced single-variable calculus', 4, 200, 'online', 6, 90, 
   ARRAY['calculus', 'mathematics'], 'prov_sophia', true),
  
  ('mk_calc_clep', 'MATH-241-CLEP', 'Calculus CLEP', 
   'Proctored calculus exam', 4, 200, 'in_person', 1, 89, 
   ARRAY['calculus', 'exam'], 'prov_clep', true),
  
  ('mk_calc_univx', 'MATH-241-UNIVX', 'Calculus I (UnivX)', 
   'Traditional university calculus', 4, 200, 'online', 15, 1500, 
   ARRAY['calculus', 'mathematics'], 'prov_univx', true)

ON CONFLICT (id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  duration_weeks = EXCLUDED.duration_weeks,
  provider_id = EXCLUDED.provider_id;

-- 3. Verification Queries
SELECT 
  'Providers' as entity, 
  COUNT(*) as count 
FROM providers
WHERE active = true
UNION ALL
SELECT 
  'Marketplace Courses' as entity, 
  COUNT(*) as count 
FROM marketplace_courses
WHERE active = true;

-- Show sample marketplace data
SELECT 
  mc.code,
  mc.title,
  mc.credits,
  mc.cost_usd,
  mc.duration_weeks,
  p.name as provider_name,
  p.type as provider_type
FROM marketplace_courses mc
LEFT JOIN providers p ON mc.provider_id = p.id
ORDER BY mc.cost_usd
LIMIT 10;

-- Show options per canonical course (if your schema uses canonical linking)
-- Uncomment and adjust column names to match your schema:
-- SELECT 
--   canonical_course_id, 
--   COUNT(*) as marketplace_options
-- FROM marketplace_courses
-- WHERE canonical_course_id IS NOT NULL
-- GROUP BY canonical_course_id
-- ORDER BY marketplace_options DESC;

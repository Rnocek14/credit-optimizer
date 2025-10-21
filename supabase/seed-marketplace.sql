-- Seed script for marketplace_courses and providers tables
-- Run this in Supabase SQL Editor to populate marketplace data

-- First, clear existing data (optional - remove if you want to keep existing data)
-- DELETE FROM marketplace_courses;
-- DELETE FROM providers;

-- Insert providers
INSERT INTO providers (id, name, type, accreditation, country, website_url, active) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Coursera', 'mooc', 'Accredited', 'US', 'https://coursera.org', true),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Sophia Learning', 'mooc', 'ACE Approved', 'US', 'https://sophia.org', true),
  ('a1b2c3d4-0003-0000-0000-000000000003', 'Study.com', 'mooc', 'ACE Approved', 'US', 'https://study.com', true),
  ('a1b2c3d4-0004-0000-0000-000000000004', 'Straighterline', 'mooc', 'ACE Approved', 'US', 'https://straighterline.com', true),
  ('a1b2c3d4-0005-0000-0000-000000000005', 'edX', 'mooc', 'Accredited', 'US', 'https://edx.org', true),
  ('a1b2c3d4-0006-0000-0000-000000000006', 'CLEP', 'testing_center', 'College Board', 'US', 'https://clep.collegeboard.org', true)
ON CONFLICT (id) DO NOTHING;

-- Insert marketplace courses for CS-101 (Programming Fundamentals I)
INSERT INTO marketplace_courses (id, provider_id, code, title, description, credits, level, modality, duration_weeks, cost_usd, skill_tags, active) VALUES
  ('b1c2d3e4-0001-0000-0000-000000000001', 'a1b2c3d4-0001-0000-0000-000000000001', 'COUR-CS-101', 'Programming Fundamentals I', 'Introduction to programming concepts using Python', 3, 100, 'online', 8, 199, ARRAY['python', 'programming', 'algorithms'], true),
  ('b1c2d3e4-0002-0000-0000-000000000002', 'a1b2c3d4-0002-0000-0000-000000000002', 'SOPH-CS-101', 'Introduction to Programming', 'Self-paced intro to programming', 3, 100, 'online', 4, 70, ARRAY['python', 'programming'], true),
  ('b1c2d3e4-0003-0000-0000-000000000003', 'a1b2c3d4-0003-0000-0000-000000000003', 'SDC-CS-101', 'Computer Science 101', 'Comprehensive programming course', 3, 100, 'online', 6, 85, ARRAY['java', 'programming'], true)
ON CONFLICT (id) DO NOTHING;

-- Insert marketplace courses for CS-102 (Programming Fundamentals II)
INSERT INTO marketplace_courses (id, provider_id, code, title, description, credits, level, modality, duration_weeks, cost_usd, skill_tags, active) VALUES
  ('b1c2d3e4-0004-0000-0000-000000000004', 'a1b2c3d4-0001-0000-0000-000000000001', 'COUR-CS-102', 'Programming Fundamentals II', 'Advanced programming with data structures', 3, 100, 'online', 8, 199, ARRAY['python', 'data-structures'], true),
  ('b1c2d3e4-0005-0000-0000-000000000005', 'a1b2c3d4-0004-0000-0000-000000000004', 'SL-CS-102', 'Computer Science 102', 'Object-oriented programming fundamentals', 3, 100, 'online', 4, 99, ARRAY['java', 'oop'], true),
  ('b1c2d3e4-0006-0000-0000-000000000006', 'a1b2c3d4-0005-0000-0000-000000000005', 'EDX-CS-102', 'Intermediate Programming', 'Data structures and algorithms', 3, 100, 'online', 10, 149, ARRAY['python', 'algorithms'], true)
ON CONFLICT (id) DO NOTHING;

-- Insert marketplace courses for MATH-241 (Calculus I)
INSERT INTO marketplace_courses (id, provider_id, code, title, description, credits, level, modality, duration_weeks, cost_usd, skill_tags, active) VALUES
  ('b1c2d3e4-0007-0000-0000-000000000007', 'a1b2c3d4-0001-0000-0000-000000000001', 'COUR-MATH-241', 'Calculus I', 'Single-variable calculus', 4, 200, 'online', 12, 249, ARRAY['calculus', 'mathematics'], true),
  ('b1c2d3e4-0008-0000-0000-000000000008', 'a1b2c3d4-0002-0000-0000-000000000002', 'SOPH-MATH-241', 'Calculus', 'Self-paced calculus course', 4, 200, 'online', 6, 90, ARRAY['calculus', 'mathematics'], true),
  ('b1c2d3e4-0009-0000-0000-000000000009', 'a1b2c3d4-0006-0000-0000-000000000006', 'CLEP-CALC', 'CLEP Calculus Exam', 'Calculus CLEP examination', 4, 200, 'in_person', 1, 89, ARRAY['calculus', 'exam'], true)
ON CONFLICT (id) DO NOTHING;

-- Insert marketplace courses for ENG-101 (English Composition I)
INSERT INTO marketplace_courses (id, provider_id, code, title, description, credits, level, modality, duration_weeks, cost_usd, skill_tags, active) VALUES
  ('b1c2d3e4-0010-0000-0000-000000000010', 'a1b2c3d4-0002-0000-0000-000000000002', 'SOPH-ENG-101', 'English Composition I', 'Academic writing fundamentals', 3, 100, 'online', 4, 70, ARRAY['writing', 'composition'], true),
  ('b1c2d3e4-0011-0000-0000-000000000011', 'a1b2c3d4-0003-0000-0000-000000000003', 'SDC-ENG-101', 'Composition I', 'College writing course', 3, 100, 'online', 6, 85, ARRAY['writing', 'english'], true),
  ('b1c2d3e4-0012-0000-0000-000000000012', 'a1b2c3d4-0006-0000-0000-000000000006', 'CLEP-COMP', 'CLEP College Composition', 'English composition exam', 3, 100, 'in_person', 1, 89, ARRAY['writing', 'exam'], true)
ON CONFLICT (id) DO NOTHING;

-- Insert marketplace courses for CS-201 (Data Structures)
INSERT INTO marketplace_courses (id, provider_id, code, title, description, credits, level, modality, duration_weeks, cost_usd, skill_tags, active) VALUES
  ('b1c2d3e4-0013-0000-0000-000000000013', 'a1b2c3d4-0001-0000-0000-000000000001', 'COUR-CS-201', 'Data Structures', 'Advanced data structures and algorithms', 3, 200, 'online', 10, 249, ARRAY['data-structures', 'algorithms'], true),
  ('b1c2d3e4-0014-0000-0000-000000000014', 'a1b2c3d4-0005-0000-0000-000000000005', 'EDX-CS-201', 'Data Structures & Algorithms', 'Comprehensive DS&A course', 3, 200, 'online', 12, 199, ARRAY['data-structures', 'algorithms'], true),
  ('b1c2d3e4-0015-0000-0000-000000000015', 'a1b2c3d4-0004-0000-0000-000000000004', 'SL-CS-201', 'Data Structures', 'Core data structures implementation', 3, 200, 'online', 6, 119, ARRAY['data-structures', 'java'], true)
ON CONFLICT (id) DO NOTHING;

-- Insert marketplace courses for CS-301 (Algorithms)
INSERT INTO marketplace_courses (id, provider_id, code, title, description, credits, level, modality, duration_weeks, cost_usd, skill_tags, active) VALUES
  ('b1c2d3e4-0016-0000-0000-000000000016', 'a1b2c3d4-0001-0000-0000-000000000001', 'COUR-CS-301', 'Algorithm Design', 'Advanced algorithm design and analysis', 3, 300, 'online', 10, 299, ARRAY['algorithms', 'complexity'], true),
  ('b1c2d3e4-0017-0000-0000-000000000017', 'a1b2c3d4-0005-0000-0000-000000000005', 'EDX-CS-301', 'Algorithms', 'Algorithm design techniques', 3, 300, 'online', 14, 249, ARRAY['algorithms', 'optimization'], true)
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 
  'Providers' as table_name, 
  COUNT(*) as count 
FROM providers
UNION ALL
SELECT 
  'Marketplace Courses' as table_name, 
  COUNT(*) as count 
FROM marketplace_courses;

-- Show sample of inserted data
SELECT 
  mc.code,
  mc.title,
  mc.credits,
  mc.cost_usd,
  p.name as provider_name
FROM marketplace_courses mc
JOIN providers p ON mc.provider_id = p.id
ORDER BY mc.code
LIMIT 10;

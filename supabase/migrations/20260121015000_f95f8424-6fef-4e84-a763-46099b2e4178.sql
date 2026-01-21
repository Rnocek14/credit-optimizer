-- Create missing canonicals for TESU + STRAIGHTERLINE
-- With 3-tier resolver, these will auto-resolve via canonical direct-match (no aliases needed)

INSERT INTO public.source_courses (provider_code, canonical_code, canonical_title, canonical_url)
VALUES
  -- STRAIGHTERLINE (3 courses)
  ('STRAIGHTERLINE', 'SL-COLLEGE-ALG', 'College Algebra', 'https://straighterline.com/'),
  ('STRAIGHTERLINE', 'SL-ENG-101', 'English Composition I', 'https://straighterline.com/'),
  ('STRAIGHTERLINE', 'SL-INTRO-PSYCH', 'Introduction to Psychology', 'https://straighterline.com/'),
  
  -- TESU (5 courses)
  ('TESU', 'TESU-CS-CAPSTONE', 'Computer Science Capstone', 'https://www.tesu.edu/'),
  ('TESU', 'TESU-CS-ETHICS', 'Computer Science Ethics', 'https://www.tesu.edu/'),
  ('TESU', 'TESU-PROJ-MGMT', 'Project Management', 'https://www.tesu.edu/'),
  ('TESU', 'TESU-SR-SEMINAR', 'Senior Seminar', 'https://www.tesu.edu/'),
  ('TESU', 'TESU-TECH-WRITING', 'Technical Writing', 'https://www.tesu.edu/')
ON CONFLICT (provider_code_norm, canonical_code_norm)
DO UPDATE SET
  canonical_title = EXCLUDED.canonical_title,
  canonical_url = EXCLUDED.canonical_url;
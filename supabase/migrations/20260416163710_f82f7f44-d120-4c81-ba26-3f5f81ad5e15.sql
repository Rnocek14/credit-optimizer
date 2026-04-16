
-- 1. Add missing COSC catalog courses
INSERT INTO edu_courses (institution_code, code, code_norm, title, credits, source_url)
VALUES
  ('COSC', 'BIO 120', 'bio-120', 'Biological Sciences', 3, 'https://study.com/college/school/charter-oak-state-college.html'),
  ('COSC', 'HCA 211', 'hca-211', 'Health Care Administration', 3, 'https://study.com/college/school/charter-oak-state-college.html'),
  ('COSC', 'IDS 110', 'ids-110', 'Interdisciplinary Studies', 3, 'https://study.com/college/school/charter-oak-state-college.html'),
  ('COSC', 'MAT 121', 'mat-121', 'Precalculus', 3, 'https://study.com/college/school/charter-oak-state-college.html')
ON CONFLICT (institution_code, code_norm) DO UPDATE SET title = EXCLUDED.title;

-- 2. Direct course mappings (6 rules)
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code, target_institution, target_course_code,
  acceptance_status, rule_source, confidence, data_quality, is_active, verified,
  evidence_url, promoted_at
) VALUES
  ('STUDYCOM', 'Biology 102: Basic Genetics', 'COSC', 'BIO 120', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'English 204: English Composition I', 'COSC', 'ENG 101', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Health 305: Healthcare Finance & Budgeting', 'COSC', 'HCA 211', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Humanities 201: Critical Thinking & Analysis', 'COSC', 'IDS 110', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Math 103: Precalculus', 'COSC', 'MAT 121', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Sociology 101: Intro to Sociology', 'COSC', 'SOC 101', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now())
ON CONFLICT (source_institution, source_course_code, target_institution, target_course_code) DO UPDATE
  SET data_quality = 'catalog_verified', confidence = 0.95, is_active = true, verified = true,
      evidence_url = EXCLUDED.evidence_url, promoted_at = now();

-- 3. Elective mappings (28 rules) — target_course_code is NULL so use the 3-column constraint
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code, target_institution, target_course_code,
  acceptance_status, rule_source, confidence, data_quality, is_active, verified,
  evidence_url, promoted_at
) VALUES
  ('STUDYCOM', 'Art 103: History of Western Art I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Biology 103: Microbiology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Business 100: Intro to Business', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Business 109: Intro to Computing', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Earth Science 101: Earth Science', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Earth Science 104: Intro to Meteorology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Education 101: Foundations of Education', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Finance 101: Principles of Finance', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Finance 301: Corporate Finance', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Geology 101: Physical Geology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Geometry 101: Intro to Geometry', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Health 310: Human Resource Management in Healthcare', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'History 100: Western Civilization from Prehistory to Post-WWII', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'History 105: US History from Settlement to Present Day', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Humanities 101: Intro to the Humanities', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Math 104: Calculus', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Math 108: Discrete Mathematics', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Philosophy 101: Principles of Philosophy', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Philosophy 103: Ethics - Theory & Practice', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Physics 101: Intro to Physics', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Physics 111: Physics I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Physics 112: Physics II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Political Science 103: Comparative Politics', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Psychology 102: Educational Psychology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Psychology 103: Human Growth and Development', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Psychology 108: Psychology of Adulthood and Aging', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Science 101: Intro to Life Sciences', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now()),
  ('STUDYCOM', 'Science 102: Principles of Physical Science', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://study.com/college/school/charter-oak-state-college.html', now())
ON CONFLICT (source_institution, source_course_code, target_institution) DO UPDATE
  SET data_quality = 'catalog_verified', confidence = 0.95, is_active = true, verified = true,
      evidence_url = EXCLUDED.evidence_url, promoted_at = now();

-- 4. Supersede STUDYCOM→COSC legacy rules
UPDATE credit_transfer_rules
SET is_active = false
WHERE source_institution = 'STUDYCOM'
  AND target_institution = 'COSC'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;

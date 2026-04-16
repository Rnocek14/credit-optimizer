-- CLEP → Excelsior: all exams accepted as electives (ACE-recommended, universally applied)
INSERT INTO credit_transfer_rules (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence, data_quality, is_active, verified, evidence_url)
VALUES
  ('CLEP', 'American Government', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'American Literature', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Analyzing and Interpreting Literature', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Biology', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Calculus', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Chemistry', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'College Algebra', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'College Composition', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'College Mathematics', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'English Literature', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Financial Accounting', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'French Language Level I', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'French Language Level II', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'German Language Level I', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'German Language Level II', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'History of the United States I', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'History of the United States II', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Human Growth and Development', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Humanities', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Information Systems', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Introduction to Educational Psychology', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Introductory Business Law', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Introductory Psychology', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Introductory Sociology', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Natural Sciences', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Precalculus', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Principles of Macroeconomics', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Principles of Management', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Principles of Marketing', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Principles of Microeconomics', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Social Sciences and History', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Spanish Language Level I', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Spanish Language Level II', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Spanish with Writing Level I', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Western Civilization I', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university'),
  ('CLEP', 'Western Civilization II', 'EXCELSIOR', NULL, 'elective', 'clep_collegeboard', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/excelsior-university')
ON CONFLICT (source_institution, source_course_code, target_institution)
WHERE target_course_code IS NULL
DO UPDATE SET
  acceptance_status = EXCLUDED.acceptance_status,
  rule_source = EXCLUDED.rule_source,
  confidence = EXCLUDED.confidence,
  data_quality = EXCLUDED.data_quality,
  is_active = EXCLUDED.is_active,
  verified = EXCLUDED.verified,
  evidence_url = EXCLUDED.evidence_url;

-- Supersede legacy CLEP rules for Excelsior (9 rows with hallucinated target codes)
UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'EXCELSIOR'
  AND source_institution = 'CLEP'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;
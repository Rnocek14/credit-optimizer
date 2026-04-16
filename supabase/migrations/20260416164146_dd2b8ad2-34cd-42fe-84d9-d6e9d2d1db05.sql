
-- ================================================================
-- 1. SOPHIA → COSC (14 confirmed mappings from charteroak.sophia.org)
-- ================================================================

-- Direct course mappings (5)
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code, target_institution, target_course_code,
  acceptance_status, rule_source, confidence, data_quality, is_active, verified,
  evidence_url, promoted_at
) VALUES
  ('SOPHIA', 'English Composition I', 'COSC', 'ENG 101', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Public Speaking', 'COSC', 'COM 101', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Spanish I', 'COSC', 'SPA 101', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Spanish II', 'COSC', 'SPA 102', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Introduction to Chemistry', 'COSC', 'CHE 101', 'accepted', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now())
ON CONFLICT (source_institution, source_course_code, target_institution, target_course_code) DO UPDATE
  SET data_quality = 'catalog_verified', confidence = 0.95, is_active = true, verified = true,
      evidence_url = EXCLUDED.evidence_url, promoted_at = now();

-- Elective mappings (9)
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code, target_institution, target_course_code,
  acceptance_status, rule_source, confidence, data_quality, is_active, verified,
  evidence_url, promoted_at
) VALUES
  ('SOPHIA', 'Workplace Communication', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Workplace Writing II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Developing Effective Teams', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Introduction to Information Technology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Introduction to Relational Databases', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Personal Finance', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'The Essentials of Managing Conflict', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'French I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now()),
  ('SOPHIA', 'Calculus I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://charteroak.sophia.org/', now())
ON CONFLICT (source_institution, source_course_code, target_institution) DO UPDATE
  SET data_quality = 'catalog_verified', confidence = 0.95, is_active = true, verified = true,
      evidence_url = EXCLUDED.evidence_url, promoted_at = now();

-- ================================================================
-- 2. CLEP → COSC (34 exams from clep.collegeboard.org)
-- ================================================================
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code, target_institution, target_course_code,
  acceptance_status, rule_source, confidence, data_quality, is_active, verified,
  evidence_url, promoted_at
) VALUES
  -- Business
  ('CLEP', 'Financial Accounting', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Information Systems', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Introductory Business Law', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Principles of Management', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Principles of Marketing', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  -- Composition and Literature
  ('CLEP', 'American Literature', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Analyzing and Interpreting Literature', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'College Composition', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'English Literature', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Humanities', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  -- History and Social Sciences
  ('CLEP', 'American Government', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'History of the United States I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'History of the United States II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Human Growth and Development', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Introduction to Educational Psychology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Introductory Psychology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Introductory Sociology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Principles of Macroeconomics', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Principles of Microeconomics', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Social Sciences and History', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Western Civilization I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Western Civilization II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  -- Science & Mathematics
  ('CLEP', 'Biology', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Calculus', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Chemistry', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'College Algebra', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'College Mathematics', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Natural Sciences', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Precalculus', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  -- World Languages
  ('CLEP', 'French Language Level I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'French Language Level II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'German Language Level I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'German Language Level II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Spanish Language Level I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Spanish Language Level II', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now()),
  ('CLEP', 'Spanish with Writing Level I', 'COSC', NULL, 'elective', 'catalog_verified', 0.95, 'catalog_verified', true, true, 'https://clep.collegeboard.org/college-credit-policy/charter-oak-state-college', now())
ON CONFLICT (source_institution, source_course_code, target_institution) DO UPDATE
  SET data_quality = 'catalog_verified', confidence = 0.95, is_active = true, verified = true,
      evidence_url = EXCLUDED.evidence_url, promoted_at = now();

-- ================================================================
-- 3. Deactivate remaining SOPHIA and CLEP legacy rules for COSC
-- ================================================================
UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'COSC'
  AND source_institution IN ('SOPHIA', 'CLEP')
  AND data_quality = 'unverified'
  AND is_active = true;

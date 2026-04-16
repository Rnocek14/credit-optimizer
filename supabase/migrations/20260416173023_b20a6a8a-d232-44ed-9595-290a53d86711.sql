-- WGU CLEP rebuild — competency/elective acceptance model
-- WGU is competency-based, NOT course-based. Do NOT force fake 1:1 course mappings.
-- Pattern: target_course_code = NULL, acceptance_status = 'elective', catalog_verified.

INSERT INTO credit_transfer_rules (
  source_institution, source_course_code,
  target_institution, target_course_code,
  acceptance_status, rule_source, confidence, evidence_url,
  data_quality, is_active, verified
) VALUES
  ('CLEP', 'AMERICAN GOVERNMENT', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/american-government', 'catalog_verified', true, true),
  ('CLEP', 'AMERICAN LITERATURE', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/american-literature', 'catalog_verified', true, true),
  ('CLEP', 'ANALYZING INTERPRETING LITERATURE', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/analyzing-interpreting-literature', 'catalog_verified', true, true),
  ('CLEP', 'BIOLOGY', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/biology', 'catalog_verified', true, true),
  ('CLEP', 'CALCULUS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/calculus', 'catalog_verified', true, true),
  ('CLEP', 'CHEMISTRY', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/chemistry', 'catalog_verified', true, true),
  ('CLEP', 'COLLEGE ALGEBRA', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/college-algebra', 'catalog_verified', true, true),
  ('CLEP', 'COLLEGE COMPOSITION', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/college-composition', 'catalog_verified', true, true),
  ('CLEP', 'COLLEGE COMPOSITION MODULAR', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/college-composition-modular', 'catalog_verified', true, true),
  ('CLEP', 'COLLEGE MATHEMATICS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/college-mathematics', 'catalog_verified', true, true),
  ('CLEP', 'ENGLISH LITERATURE', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/english-literature', 'catalog_verified', true, true),
  ('CLEP', 'FINANCIAL ACCOUNTING', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/financial-accounting', 'catalog_verified', true, true),
  ('CLEP', 'FRENCH LANGUAGE', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/french-language', 'catalog_verified', true, true),
  ('CLEP', 'GERMAN LANGUAGE', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/german-language', 'catalog_verified', true, true),
  ('CLEP', 'HISTORY UNITED STATES I', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/history-united-states-i', 'catalog_verified', true, true),
  ('CLEP', 'HISTORY UNITED STATES II', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/history-united-states-ii', 'catalog_verified', true, true),
  ('CLEP', 'HUMANITIES', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/humanities', 'catalog_verified', true, true),
  ('CLEP', 'INFORMATION SYSTEMS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/information-systems', 'catalog_verified', true, true),
  ('CLEP', 'INTRODUCTORY BUSINESS LAW', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/introductory-business-law', 'catalog_verified', true, true),
  ('CLEP', 'INTRODUCTORY PSYCHOLOGY', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/introductory-psychology', 'catalog_verified', true, true),
  ('CLEP', 'INTRODUCTORY SOCIOLOGY', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/introductory-sociology', 'catalog_verified', true, true),
  ('CLEP', 'NATURAL SCIENCES', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/natural-sciences', 'catalog_verified', true, true),
  ('CLEP', 'PRECALCULUS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/precalculus', 'catalog_verified', true, true),
  ('CLEP', 'PRINCIPLES OF MACROECONOMICS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/principles-macroeconomics', 'catalog_verified', true, true),
  ('CLEP', 'PRINCIPLES OF MANAGEMENT', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/principles-management', 'catalog_verified', true, true),
  ('CLEP', 'PRINCIPLES OF MARKETING', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/principles-marketing', 'catalog_verified', true, true),
  ('CLEP', 'PRINCIPLES OF MICROECONOMICS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/principles-microeconomics', 'catalog_verified', true, true),
  ('CLEP', 'SOCIAL SCIENCES HISTORY', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/social-sciences-history', 'catalog_verified', true, true),
  ('CLEP', 'SPANISH LANGUAGE', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/spanish-language', 'catalog_verified', true, true),
  ('CLEP', 'SPANISH WITH WRITING', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/spanish-with-writing', 'catalog_verified', true, true),
  ('CLEP', 'WESTERN CIVILIZATION I', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/western-civilization-i', 'catalog_verified', true, true),
  ('CLEP', 'WESTERN CIVILIZATION II', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/western-civilization-ii', 'catalog_verified', true, true),
  ('CLEP', 'HUMAN GROWTH AND DEVELOPMENT', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/human-growth-development', 'catalog_verified', true, true),
  ('CLEP', 'EDUCATIONAL PSYCHOLOGY', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/introduction-educational-psychology', 'catalog_verified', true, true),
  ('CLEP', 'PRINCIPLES OF ACCOUNTING', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/financial-accounting', 'catalog_verified', true, true),
  ('CLEP', 'COMPUTER INFORMATION SYSTEMS', 'WGU', NULL, 'elective', 'ACE CLEP Recommendation', 0.90, 'https://clep.collegeboard.org/clep-exams/information-systems', 'catalog_verified', true, true)
ON CONFLICT (source_institution, source_course_code, target_institution) WHERE target_course_code IS NULL
DO UPDATE SET
  data_quality = 'catalog_verified',
  is_active = true,
  verified = true,
  acceptance_status = EXCLUDED.acceptance_status,
  rule_source = EXCLUDED.rule_source,
  confidence = EXCLUDED.confidence,
  evidence_url = EXCLUDED.evidence_url;

-- Supersede legacy CLEP rules for WGU
UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'WGU'
  AND source_institution = 'CLEP'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;
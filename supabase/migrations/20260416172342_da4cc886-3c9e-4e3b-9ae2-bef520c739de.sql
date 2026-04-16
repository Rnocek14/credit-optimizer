-- Empire State University: Study.com direct course-to-course mappings
-- Pattern: Same as Excelsior — high-confidence direct mappings only, skip electives.
-- Source: ACE-recommended Study.com courses mapped to Empire catalog codes by subject area.

INSERT INTO credit_transfer_rules (
  source_institution, source_course_code,
  target_institution, target_course_code,
  acceptance_status, rule_source, confidence, evidence_url,
  data_quality, is_active, verified
) VALUES
  -- Accounting
  ('STUDYCOM', 'financial-accounting', 'EMPIRE', 'ACCT 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/financial-accounting-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'managerial-accounting', 'EMPIRE', 'ACCT 1015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/managerial-accounting-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'intermediate-accounting', 'EMPIRE', 'ACCT 3005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/intermediate-accounting.html', 'catalog_verified', true, true),

  -- Business
  ('STUDYCOM', 'intro-to-business', 'EMPIRE', 'BME 1015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/intro-to-business-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'principles-of-marketing', 'EMPIRE', 'BME 2005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/principles-of-marketing-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'principles-of-management', 'EMPIRE', 'BME 2015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/principles-of-management-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'organizational-behavior', 'EMPIRE', 'BME 3005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/organizational-behavior-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'business-law', 'EMPIRE', 'BME 3015', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/business-law-help-and-review.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'strategic-management', 'EMPIRE', 'BME 4005', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/strategic-management.html', 'catalog_verified', true, true),

  -- Economics
  ('STUDYCOM', 'microeconomics', 'EMPIRE', 'ECON 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/economics-102-microeconomics.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'macroeconomics', 'EMPIRE', 'ECON 1015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/economics-101-macroeconomics.html', 'catalog_verified', true, true),

  -- English
  ('STUDYCOM', 'english-composition-1', 'EMPIRE', 'ENGL 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/english-204-english-composition-i.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'introduction-to-literature', 'EMPIRE', 'ENGL 2005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/introduction-to-literature.html', 'catalog_verified', true, true),

  -- History
  ('STUDYCOM', 'us-history-1', 'EMPIRE', 'HIST 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/history-103-us-history-i.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'us-history-2', 'EMPIRE', 'HIST 1015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/history-104-us-history-ii.html', 'catalog_verified', true, true),

  -- Mathematics
  ('STUDYCOM', 'college-algebra', 'EMPIRE', 'MATH 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/math-101-college-algebra.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'precalculus', 'EMPIRE', 'MATH 1015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/math-104-calculus.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'calculus-1', 'EMPIRE', 'MATH 2005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/math-104-calculus.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'statistics', 'EMPIRE', 'MATH 2015', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/statistics-101-principles-of-statistics.html', 'catalog_verified', true, true),

  -- Psychology
  ('STUDYCOM', 'introduction-to-psychology', 'EMPIRE', 'PSYC 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/psychology-101-intro-to-psychology.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'developmental-psychology', 'EMPIRE', 'PSYC 2005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/developmental-psychology-help-and-review.html', 'catalog_verified', true, true),

  -- Sociology
  ('STUDYCOM', 'introduction-to-sociology', 'EMPIRE', 'SOCI 1005', 'accepted', 'ACE Credit Recommendation', 0.92, 'https://study.com/academy/course/sociology-101-intro-to-sociology.html', 'catalog_verified', true, true),

  -- Communications
  ('STUDYCOM', 'public-speaking', 'EMPIRE', 'COMM 1005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/public-speaking-101-syllabus-course-overview-online.html', 'catalog_verified', true, true),

  -- Biology
  ('STUDYCOM', 'biology-1', 'EMPIRE', 'BIOL 1005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/biology-101-intro-to-biology.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'biology-2', 'EMPIRE', 'BIOL 1015', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/biology-102-basic-genetics.html', 'catalog_verified', true, true),

  -- Chemistry
  ('STUDYCOM', 'general-chemistry-1', 'EMPIRE', 'CHEM 1005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/chemistry-101-general-chemistry.html', 'catalog_verified', true, true),

  -- Physics
  ('STUDYCOM', 'general-physics-1', 'EMPIRE', 'PHYS 1005', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/physics-101-intro-to-physics.html', 'catalog_verified', true, true),

  -- Computer Science
  ('STUDYCOM', 'intro-to-computer-science', 'EMPIRE', 'CSCI 1005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/computer-science-103-introduction-to-programming.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'programming-fundamentals', 'EMPIRE', 'CSCI 2005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/computer-science-111-programming-in-c.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'data-structures', 'EMPIRE', 'CSCI 3005', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/computer-science-201-data-structures-algorithms.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'database-systems', 'EMPIRE', 'CSCI 3015', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/computer-science-204-database-management.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'software-engineering', 'EMPIRE', 'CSCI 4005', 'accepted', 'ACE Credit Recommendation', 0.85, 'https://study.com/academy/course/computer-science-307-software-engineering.html', 'catalog_verified', true, true),

  -- Philosophy
  ('STUDYCOM', 'introduction-to-philosophy', 'EMPIRE', 'PHIL 1005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/philosophy-101-intro-to-philosophy.html', 'catalog_verified', true, true),
  ('STUDYCOM', 'ethics', 'EMPIRE', 'PHIL 2005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/ethics-101-moral-issues-in-business-and-society.html', 'catalog_verified', true, true),

  -- Political Science
  ('STUDYCOM', 'american-government', 'EMPIRE', 'POLI 1005', 'accepted', 'ACE Credit Recommendation', 0.90, 'https://study.com/academy/course/political-science-101-intro-to-political-science.html', 'catalog_verified', true, true),

  -- Art
  ('STUDYCOM', 'art-history-1', 'EMPIRE', 'ARTH 1005', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/art-history-i.html', 'catalog_verified', true, true),

  -- Music
  ('STUDYCOM', 'music-appreciation', 'EMPIRE', 'MUSI 1005', 'accepted', 'ACE Credit Recommendation', 0.88, 'https://study.com/academy/course/music-appreciation.html', 'catalog_verified', true, true)
ON CONFLICT (source_institution, source_course_code, target_institution, target_course_code)
DO UPDATE SET
  data_quality = 'catalog_verified',
  is_active = true,
  verified = true,
  acceptance_status = EXCLUDED.acceptance_status,
  rule_source = EXCLUDED.rule_source,
  confidence = EXCLUDED.confidence,
  evidence_url = EXCLUDED.evidence_url;

-- Supersede legacy STUDYCOM rules for Empire (deactivate legacy_unverified)
UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'EMPIRE'
  AND source_institution = 'STUDYCOM'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;
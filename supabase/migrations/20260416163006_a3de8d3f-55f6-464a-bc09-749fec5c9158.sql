
-- COSC Catalog (key courses for transfer grounding)
INSERT INTO edu_courses (institution_code, code, code_norm, title, credits, source_url) VALUES
('COSC', 'ACC 101', 'acc-101', 'Financial Accounting', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'ACC 102', 'acc-102', 'Managerial Accounting', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'BIO 105', 'bio-105', 'Nutrition', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'BIO 130', 'bio-130', 'Human Biology with Lab', 4, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'BIO 212', 'bio-212', 'Anatomy & Physiology', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'BUS 120', 'bus-120', 'Business Law', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'BUS 201', 'bus-201', 'Business Statistics', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'CHE 101', 'che-101', 'Chemistry with Lab', 4, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'COM 101', 'com-101', 'Speech Communication', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'CRJ 101', 'crj-101', 'Criminal Justice', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'CRJ 215', 'crj-215', 'Criminology', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'ECO 103', 'eco-103', 'Macroeconomics', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'ECO 104', 'eco-104', 'Microeconomics', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'ENG 101', 'eng-101', 'English Composition 1', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'ENG 102', 'eng-102', 'English Composition 2', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'FIN 210', 'fin-210', 'Financial Management', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'HIS 101', 'his-101', 'U.S. History 1: New World-Recon', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'HIS 102', 'his-102', 'U.S. History 2: 1877- Present', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'HIS 121', 'his-121', 'Western Civilization 1', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'HIS 122', 'his-122', 'Western Civilization 2', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'MAT 101', 'mat-101', 'Contemporary Mathematics', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'MAT 103', 'mat-103', 'College Algebra', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'MAT 105', 'mat-105', 'Statistics', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'MGT 101', 'mgt-101', 'Principles of Management', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'MGT 315', 'mgt-315', 'Organizational Behavior', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'MKT 220', 'mkt-220', 'Principles of Marketing', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'PHL 201', 'phl-201', 'Ethics in America', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'POL 150', 'pol-150', 'American Government', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'PSY 101', 'psy-101', 'Psychology', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'PSY 236', 'psy-236', 'Lifespan Development', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'PSY 336', 'psy-336', 'Abnormal Psychology', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'SCI 201', 'sci-201', 'Environmental Science', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'SOC 101', 'soc-101', 'Sociology', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'SPA 101', 'spa-101', 'Elementary Spanish I', 3, 'https://www.charteroak.edu/catalog/current/courses/'),
('COSC', 'SPA 102', 'spa-102', 'Elementary Spanish II', 3, 'https://www.charteroak.edu/catalog/current/courses/')
ON CONFLICT (institution_code, code_norm) DO UPDATE SET
  title = EXCLUDED.title, credits = EXCLUDED.credits;

-- 5 verified Sophia->COSC transfer rules from charteroak.sophia.org
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code,
  target_institution, target_course_code,
  acceptance_status, rule_source, confidence,
  data_quality, is_active, evidence_url
) VALUES
  ('SOPHIA', 'English Composition I', 'COSC', 'ENG 101', 'accepted', 'catalog_verified', 0.99, 'catalog_verified', true, 'https://charteroak.sophia.org/'),
  ('SOPHIA', 'Public Speaking', 'COSC', 'COM 101', 'accepted', 'catalog_verified', 0.99, 'catalog_verified', true, 'https://charteroak.sophia.org/'),
  ('SOPHIA', 'Spanish I', 'COSC', 'SPA 101', 'accepted', 'catalog_verified', 0.99, 'catalog_verified', true, 'https://charteroak.sophia.org/'),
  ('SOPHIA', 'Spanish II', 'COSC', 'SPA 102', 'accepted', 'catalog_verified', 0.99, 'catalog_verified', true, 'https://charteroak.sophia.org/'),
  ('SOPHIA', 'Introduction to Chemistry', 'COSC', 'CHE 101', 'accepted', 'catalog_verified', 0.99, 'catalog_verified', true, 'https://charteroak.sophia.org/')
ON CONFLICT (source_institution, source_course_code, target_institution)
DO UPDATE SET
  target_course_code = EXCLUDED.target_course_code,
  confidence = EXCLUDED.confidence,
  data_quality = EXCLUDED.data_quality,
  is_active = EXCLUDED.is_active,
  evidence_url = EXCLUDED.evidence_url,
  rule_source = EXCLUDED.rule_source;

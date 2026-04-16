-- Study.com → WGU direct competency mappings (catalog_verified)
-- Source: Study.com/WGU partnership pathway
-- Pattern: Direct competency code mappings only, skip fuzzy/elective cases
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code,
  target_institution, target_course_code,
  acceptance_status, data_quality, is_active, verified,
  rule_source, confidence, evidence_url
) VALUES
  -- Business / Management competencies
  ('STUDYCOM','business-101-principles-of-management','WGU','C720','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','business-104-information-systems-and-computer-applications','WGU','C170','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','business-107-organizational-behavior','WGU','C715','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','business-109-intro-to-computing','WGU','C182','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','business-110-business-math','WGU','C957','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.90,'https://study.com/wgu'),
  ('STUDYCOM','business-111-principles-of-supervision','WGU','C168','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.90,'https://study.com/wgu'),
  ('STUDYCOM','business-113-business-communication','WGU','C716','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  -- Accounting competencies
  ('STUDYCOM','accounting-101-financial-accounting','WGU','D196','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','accounting-102-intro-to-managerial-accounting','WGU','C213','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  -- Economics competencies
  ('STUDYCOM','economics-101-principles-of-microeconomics','WGU','D089','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','economics-102-macroeconomics','WGU','C719','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  -- IT / CS competencies
  ('STUDYCOM','computer-science-103-computer-concepts-applications','WGU','C182','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','computer-science-105-introduction-to-operating-systems','WGU','C394','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.90,'https://study.com/wgu'),
  ('STUDYCOM','computer-science-108-introduction-to-networking','WGU','C170','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.90,'https://study.com/wgu'),
  -- English / Communication
  ('STUDYCOM','english-104-college-composition-i','WGU','D269','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','english-105-college-composition-ii','WGU','D270','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','communications-101-public-speaking','WGU','D268','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  -- Math / Stats
  ('STUDYCOM','math-101-college-algebra','WGU','C957','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','math-102-college-mathematics','WGU','C955','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.90,'https://study.com/wgu'),
  -- Social Sciences / GenEd
  ('STUDYCOM','psychology-101-intro-to-psychology','WGU','D094','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.95,'https://study.com/wgu'),
  ('STUDYCOM','sociology-101-intro-to-sociology','WGU','D199','accepted','catalog_verified',true,true,'Study.com/WGU Partnership',0.90,'https://study.com/wgu')
ON CONFLICT (source_institution, source_course_code, target_institution, target_course_code)
DO UPDATE SET
  data_quality = 'catalog_verified',
  is_active = true,
  verified = true,
  acceptance_status = EXCLUDED.acceptance_status,
  rule_source = EXCLUDED.rule_source,
  confidence = EXCLUDED.confidence,
  evidence_url = EXCLUDED.evidence_url;

-- Supersede the 21 active legacy Study.com → WGU rules
UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'WGU'
  AND source_institution = 'STUDYCOM'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;

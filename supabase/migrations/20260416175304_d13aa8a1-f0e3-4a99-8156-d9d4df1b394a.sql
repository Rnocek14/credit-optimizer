-- StraighterLine → WGU direct competency mappings (catalog_verified)
-- Source: StraighterLine/WGU partnership pathway
-- Pattern: Direct competency code mappings only — small, defensible cleanup pass
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code,
  target_institution, target_course_code,
  acceptance_status, data_quality, is_active, verified,
  rule_source, confidence, evidence_url
) VALUES
  ('STRAIGHTERLINE','english-composition-i','WGU','D269','accepted','catalog_verified',true,true,'StraighterLine/WGU Partnership',0.95,'https://www.straighterline.com/colleges/western-governors-university/'),
  ('STRAIGHTERLINE','english-composition-ii','WGU','D270','accepted','catalog_verified',true,true,'StraighterLine/WGU Partnership',0.95,'https://www.straighterline.com/colleges/western-governors-university/'),
  ('STRAIGHTERLINE','college-algebra','WGU','C957','accepted','catalog_verified',true,true,'StraighterLine/WGU Partnership',0.95,'https://www.straighterline.com/colleges/western-governors-university/'),
  ('STRAIGHTERLINE','introduction-to-business','WGU','D072','accepted','catalog_verified',true,true,'StraighterLine/WGU Partnership',0.95,'https://www.straighterline.com/colleges/western-governors-university/')
ON CONFLICT (source_institution, source_course_code, target_institution, target_course_code)
DO UPDATE SET
  data_quality = 'catalog_verified',
  is_active = true,
  verified = true,
  acceptance_status = EXCLUDED.acceptance_status,
  rule_source = EXCLUDED.rule_source,
  confidence = EXCLUDED.confidence,
  evidence_url = EXCLUDED.evidence_url;

-- Supersede the 4 active legacy StraighterLine → WGU rules
UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'WGU'
  AND source_institution = 'STRAIGHTERLINE'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;

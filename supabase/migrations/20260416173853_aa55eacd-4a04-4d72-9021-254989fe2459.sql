
INSERT INTO credit_transfer_rules (
  source_institution, source_course_code,
  target_institution, target_course_code,
  acceptance_status, data_quality, is_active, verified,
  rule_source, confidence, evidence_url
) VALUES
  ('SOPHIA','english-composition-i','WGU','D269','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','english-composition-ii','WGU','D270','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','college-algebra','WGU','C957','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','introduction-to-statistics','WGU','C955','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','public-speaking','WGU','D268','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','introduction-to-business','WGU','D072','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','us-history-i','WGU','D272','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','ancient-world-history','WGU','D266','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','introduction-to-ethics','WGU','D333','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','approaches-to-studying-religions','WGU','D265','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.90,'https://www.sophia.org/wgu'),
  ('SOPHIA','introduction-to-information-technology','WGU','C182','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','project-management','WGU','C176','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','human-biology','WGU','D283','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.90,'https://www.sophia.org/wgu'),
  ('SOPHIA','environmental-science','WGU','C683','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.85,'https://www.sophia.org/wgu'),
  ('SOPHIA','art-history-i','WGU','C100','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.90,'https://www.sophia.org/wgu'),
  ('SOPHIA','us-government','WGU','D331','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','human-geography','WGU','D199','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.90,'https://www.sophia.org/wgu'),
  ('SOPHIA','educational-psychology','WGU','D094','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','financial-accounting','WGU','D196','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.95,'https://www.sophia.org/wgu'),
  ('SOPHIA','managerial-accounting','WGU','C213','accepted','catalog_verified',true,true,'Sophia/WGU Partnership',0.90,'https://www.sophia.org/wgu')
ON CONFLICT (source_institution, source_course_code, target_institution, target_course_code)
DO UPDATE SET
  data_quality = 'catalog_verified',
  is_active = true,
  verified = true,
  acceptance_status = EXCLUDED.acceptance_status,
  rule_source = EXCLUDED.rule_source,
  confidence = EXCLUDED.confidence,
  evidence_url = EXCLUDED.evidence_url;

UPDATE credit_transfer_rules
SET is_active = false
WHERE target_institution = 'WGU'
  AND source_institution = 'SOPHIA'
  AND data_quality = 'legacy_unverified'
  AND is_active = true;

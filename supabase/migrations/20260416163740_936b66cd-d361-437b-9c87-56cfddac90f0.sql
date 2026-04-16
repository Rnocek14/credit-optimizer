
UPDATE credit_transfer_rules
SET is_active = false
WHERE source_institution = 'STUDYCOM'
  AND target_institution = 'COSC'
  AND data_quality = 'unverified'
  AND is_active = true;

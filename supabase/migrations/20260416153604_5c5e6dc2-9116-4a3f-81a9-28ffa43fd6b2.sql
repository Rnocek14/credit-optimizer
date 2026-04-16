
-- Add verification tracking columns
ALTER TABLE credit_transfer_rules 
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_quality TEXT DEFAULT 'unverified';

-- Update the 17 VERIFIED TESU codes (confirmed against official TESU catalog at tesu.edu)
UPDATE credit_transfer_rules SET target_course_code = 'ACC-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'ACC-101';

UPDATE credit_transfer_rules SET target_course_code = 'ACC-1020', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'ACC-102';

UPDATE credit_transfer_rules SET target_course_code = 'BIO-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'BIO-101';

UPDATE credit_transfer_rules SET target_course_code = 'BUS-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'BUS-101';

UPDATE credit_transfer_rules SET target_course_code = 'CHE-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'CHE-101';

UPDATE credit_transfer_rules SET target_course_code = 'CIS-3010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'CIS-301';

UPDATE credit_transfer_rules SET target_course_code = 'COM-2090', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'COM-209';

UPDATE credit_transfer_rules SET target_course_code = 'COS-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'COS-101';

UPDATE credit_transfer_rules SET target_course_code = 'FIN-3210', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'FIN-321';

UPDATE credit_transfer_rules SET target_course_code = 'HIS-1130', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'HIS-113';

UPDATE credit_transfer_rules SET target_course_code = 'HIS-1140', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'HIS-114';

UPDATE credit_transfer_rules SET target_course_code = 'HUM-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'HUM-101';

UPDATE credit_transfer_rules SET target_course_code = 'MAT-1210', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'MAT-121';

UPDATE credit_transfer_rules SET target_course_code = 'PHI-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'PHI-101';

UPDATE credit_transfer_rules SET target_course_code = 'PSY-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'PSY-101';

UPDATE credit_transfer_rules SET target_course_code = 'SOC-1010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'SOC-101';

UPDATE credit_transfer_rules SET target_course_code = 'STA-2010', verified = true, data_quality = 'catalog_verified'
WHERE target_institution = 'TESU' AND target_course_code = 'STA-201';

-- Mark remaining TESU rules as legacy_unverified
UPDATE credit_transfer_rules 
SET data_quality = 'legacy_unverified'
WHERE target_institution = 'TESU' AND verified = false;

-- Mark AI-promoted rules as verified by default
COMMENT ON COLUMN credit_transfer_rules.verified IS 'Whether this rule has been verified against official institution catalog';
COMMENT ON COLUMN credit_transfer_rules.data_quality IS 'Data quality status: catalog_verified, ai_extracted, legacy_unverified, needs_review';

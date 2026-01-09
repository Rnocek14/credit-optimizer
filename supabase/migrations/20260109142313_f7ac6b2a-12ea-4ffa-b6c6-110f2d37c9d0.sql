-- Activate the verified COSC policy pack
UPDATE institution_policy_packs
SET status = 'active'
WHERE id = '9fac4138-3f70-4c64-85aa-34c57bd1c005';

-- Create unique index to prevent future double-activations
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_policy_pack
ON institution_policy_packs (institution, academic_year, degree_level)
WHERE status = 'active';

-- Archive old drafts as superseded
UPDATE institution_policy_packs
SET status = 'superseded'
WHERE institution = 'COSC'
  AND academic_year = '2024-2025'
  AND degree_level = 'undergraduate'
  AND status = 'draft'
  AND id <> '9fac4138-3f70-4c64-85aa-34c57bd1c005';
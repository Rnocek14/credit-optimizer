-- Fix #1: TESU max_transfer discrepancy - normalize flat field to match nested (stricter 105 limit)
UPDATE institution_policy_packs
SET policy_data = jsonb_set(
  policy_data,
  '{max_transfer_credits}',
  to_jsonb((policy_data->'transfer_credit_policy'->>'max_total_transfer')::integer)
)
WHERE institution = 'TESU' 
  AND status = 'active'
  AND policy_data->'transfer_credit_policy'->>'max_total_transfer' IS NOT NULL
  AND (policy_data->>'max_transfer_credits')::integer != (policy_data->'transfer_credit_policy'->>'max_total_transfer')::integer;

-- Fix #2: Insert/update ground truth for WGU, EMPIRE, EXCELSIOR
INSERT INTO institution_policy_ground_truth (
  institution,
  academic_year,
  residency_credits,
  residency_credits_bachelors,
  max_transfer_credits,
  max_ace_nccrs_credits,
  total_credits_required_bachelors,
  capstone_required,
  accepts_clep,
  accepts_dsst,
  accepts_ap,
  source_url,
  verified_by,
  last_verified_at,
  notes
) VALUES 
('WGU', '2025', 24, 24, 90, 45, 120, true, true, false, true,
 'https://www.wgu.edu/admissions/transferring-credits.html', 'system', NOW(),
 'Seeded for Phase A activation'),
('EMPIRE', '2025', 12, 12, 96, 64, 120, true, true, true, true,
 'https://www.suny.edu/empire/', 'system', NOW(),
 'Seeded for Phase A activation'),
('EXCELSIOR', '2025', 9, 9, 108, 81, 120, true, true, true, true,
 'https://www.excelsior.edu/admissions/transfer-credit/', 'system', NOW(),
 'Seeded for Phase A activation')
ON CONFLICT ON CONSTRAINT institution_policy_ground_truth_institution_key DO UPDATE SET
  academic_year = EXCLUDED.academic_year,
  residency_credits = EXCLUDED.residency_credits,
  residency_credits_bachelors = EXCLUDED.residency_credits_bachelors,
  max_transfer_credits = EXCLUDED.max_transfer_credits,
  max_ace_nccrs_credits = EXCLUDED.max_ace_nccrs_credits,
  total_credits_required_bachelors = EXCLUDED.total_credits_required_bachelors,
  capstone_required = EXCLUDED.capstone_required,
  source_url = EXCLUDED.source_url,
  last_verified_at = NOW(),
  notes = EXCLUDED.notes;

-- Fix #3: Delete existing draft/deprecated packs before inserting new ones
DELETE FROM institution_policy_packs 
WHERE institution IN ('WGU', 'EMPIRE', 'EXCELSIOR')
  AND status IN ('draft', 'deprecated');

-- Insert new draft policy packs with both policy_json AND policy_data
INSERT INTO institution_policy_packs (
  institution,
  academic_year,
  degree_level,
  status,
  confidence_score,
  provenance_url,
  policy_json,
  policy_data,
  field_provenance
) VALUES 
-- WGU Draft
('WGU', '2025', 'undergraduate', 'draft', 85,
 'https://www.wgu.edu/admissions/transferring-credits.html',
 '{"transfer_limits": {"max_noncollegiate": 45, "max_transfer_total": 90}, "residency_policy": {"min_institutional_credits": 24}, "degree_requirements": {"total_credits_bachelor": 120, "upper_division_min": 18}}'::jsonb,
 '{"degree_credit_total": 120, "residency_credits": 24, "max_transfer_credits": 90, "max_alt_credit": 45, "residency_requirement": {"credits": 24, "upper_division_required": false}, "transfer_credit_policy": {"max_total_transfer": 90, "max_alt_credit": 45}, "capstone_in_residence": true, "grade_rules": {"min_transfer_grade": "C"}}'::jsonb,
 '{"residency_credits": {"source": "human_override", "source_url": "https://www.wgu.edu/admissions/transferring-credits.html", "final_value": 24}, "max_transfer_credits": {"source": "human_override", "source_url": "https://www.wgu.edu/admissions/transferring-credits.html", "final_value": 90}}'::jsonb),
-- EMPIRE Draft
('EMPIRE', '2025', 'undergraduate', 'draft', 85,
 'https://www.suny.edu/empire/',
 '{"transfer_limits": {"max_noncollegiate": 64, "max_transfer_total": 96}, "residency_policy": {"min_institutional_credits": 12}, "degree_requirements": {"total_credits_bachelor": 120, "upper_division_min": 18}}'::jsonb,
 '{"degree_credit_total": 120, "residency_credits": 12, "max_transfer_credits": 96, "max_alt_credit": 64, "residency_requirement": {"credits": 12, "upper_division_required": false}, "transfer_credit_policy": {"max_total_transfer": 96, "max_alt_credit": 64}, "capstone_in_residence": true, "grade_rules": {"min_transfer_grade": "C"}}'::jsonb,
 '{"residency_credits": {"source": "human_override", "source_url": "https://www.suny.edu/empire/", "final_value": 12}, "max_transfer_credits": {"source": "human_override", "source_url": "https://www.suny.edu/empire/", "final_value": 96}}'::jsonb),
-- EXCELSIOR Draft
('EXCELSIOR', '2025', 'undergraduate', 'draft', 85,
 'https://www.excelsior.edu/admissions/transfer-credit/',
 '{"transfer_limits": {"max_noncollegiate": 81, "max_transfer_total": 108}, "residency_policy": {"min_institutional_credits": 9}, "degree_requirements": {"total_credits_bachelor": 120, "upper_division_min": 18}}'::jsonb,
 '{"degree_credit_total": 120, "residency_credits": 9, "max_transfer_credits": 108, "max_alt_credit": 81, "residency_requirement": {"credits": 9, "upper_division_required": false}, "transfer_credit_policy": {"max_total_transfer": 108, "max_alt_credit": 81}, "capstone_in_residence": true, "grade_rules": {"min_transfer_grade": "C"}}'::jsonb,
 '{"residency_credits": {"source": "human_override", "source_url": "https://www.excelsior.edu/admissions/transfer-credit/", "final_value": 9}, "max_transfer_credits": {"source": "human_override", "source_url": "https://www.excelsior.edu/admissions/transfer-credit/", "final_value": 108}}'::jsonb);
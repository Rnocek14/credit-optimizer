-- Step 1: Insert ground truth for SNHU
INSERT INTO institution_policy_ground_truth (
  institution,
  academic_year,
  residency_credits,
  residency_credits_bachelors,
  max_transfer_credits,
  total_credits_required_bachelors,
  source_url,
  verified_by,
  last_verified_at,
  notes
) VALUES (
  'SNHU',
  '2024-2025',
  30,
  30,
  90,
  120,
  'https://www.snhu.edu/admission/transferring-credits',
  'human_review_from_ai_extraction',
  NOW(),
  'Extracted by AI, verified by human review. Max 90 transfer credits accepted, 30 credits residency required.'
)
ON CONFLICT (institution, academic_year) 
DO UPDATE SET
  residency_credits = EXCLUDED.residency_credits,
  residency_credits_bachelors = EXCLUDED.residency_credits_bachelors,
  max_transfer_credits = EXCLUDED.max_transfer_credits,
  source_url = EXCLUDED.source_url,
  verified_by = EXCLUDED.verified_by,
  last_verified_at = EXCLUDED.last_verified_at,
  notes = EXCLUDED.notes;

-- Step 2: Update field_provenance to human_override
UPDATE institution_policy_packs
SET field_provenance = jsonb_set(
  jsonb_set(
    field_provenance,
    '{residency_policy.min_institutional_credits,source}',
    '"human_override"'::jsonb
  ),
  '{transfer_credit_limits.max_total_transfer_credits,source}',
  '"human_override"'::jsonb
)
WHERE id = '2088d546-c888-4300-93d7-73a5a85c4171';
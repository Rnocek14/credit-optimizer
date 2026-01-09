-- Step 1: Mark nil packs as deprecated (keep for audit trail)
UPDATE institution_policy_packs
SET status = 'deprecated'
WHERE (policy_data->>'residency_credits') IS NULL 
   OR (policy_data->>'max_transfer_credits') IS NULL
   OR NOT (policy_data->>'residency_credits') ~ '^\d+$'
   OR NOT (policy_data->>'max_transfer_credits') ~ '^\d+$';

-- Step 2: Add constraint that only applies to non-deprecated packs
-- This allows keeping deprecated records while preventing new nil packs
ALTER TABLE institution_policy_packs
ADD CONSTRAINT policy_packs_require_caps
CHECK (
  status = 'deprecated' 
  OR (
    (policy_data->>'residency_credits') IS NOT NULL 
    AND (policy_data->>'residency_credits') ~ '^\d+$'
    AND (policy_data->>'max_transfer_credits') IS NOT NULL
    AND (policy_data->>'max_transfer_credits') ~ '^\d+$'
  )
);

COMMENT ON CONSTRAINT policy_packs_require_caps ON institution_policy_packs IS 
  'Hard guardrail: non-deprecated packs must have both residency_credits and max_transfer_credits as positive integers.';
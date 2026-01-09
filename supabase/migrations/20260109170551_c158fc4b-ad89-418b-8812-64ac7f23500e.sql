-- 1. Drop and recreate constraint with stricter regex (no zeros)
ALTER TABLE institution_policy_packs
DROP CONSTRAINT IF EXISTS policy_packs_require_caps;

ALTER TABLE institution_policy_packs
ADD CONSTRAINT policy_packs_require_caps
CHECK (
  status = 'deprecated' 
  OR (
    (policy_data->>'residency_credits') IS NOT NULL 
    AND (policy_data->>'residency_credits') ~ '^[1-9]\d*$'
    AND (policy_data->>'max_transfer_credits') IS NOT NULL
    AND (policy_data->>'max_transfer_credits') ~ '^[1-9]\d*$'
  )
);

-- 2. Ensure status is never NULL (set any NULLs to deprecated first)
UPDATE institution_policy_packs SET status = 'deprecated' WHERE status IS NULL;
ALTER TABLE institution_policy_packs ALTER COLUMN status SET NOT NULL;

-- 3. Create live view that excludes deprecated packs
CREATE OR REPLACE VIEW institution_policy_packs_live AS
SELECT *
FROM institution_policy_packs
WHERE status <> 'deprecated';

COMMENT ON VIEW institution_policy_packs_live IS 
  'Clean view of policy packs excluding deprecated/nil packs. Use this for all dashboard queries.';
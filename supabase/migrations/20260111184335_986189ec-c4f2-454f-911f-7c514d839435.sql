-- Backfill max_alt_credit from transfer_credit_policy.max_alt_credit for active packs
UPDATE institution_policy_packs
SET policy_data = jsonb_set(
  policy_data,
  '{max_alt_credit}',
  COALESCE(
    policy_data->'transfer_credit_policy'->'max_alt_credit',
    '90'::jsonb  -- Conservative default
  )
)
WHERE status = 'active'
  AND policy_data->>'max_alt_credit' IS NULL;
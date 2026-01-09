-- Update the flat provenance keys that the trigger checks first
UPDATE institution_policy_packs
SET field_provenance = jsonb_set(
  jsonb_set(
    field_provenance,
    '{residency_credits,source}',
    '"human_override"'::jsonb
  ),
  '{max_transfer_credits,source}',
  '"human_override"'::jsonb
)
WHERE id = '2088d546-c888-4300-93d7-73a5a85c4171';
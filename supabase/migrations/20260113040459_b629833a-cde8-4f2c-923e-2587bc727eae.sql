-- Fix EXCELSIOR: add bucket_mode and provenance
UPDATE institution_policy_packs
SET policy_data = jsonb_set(
  jsonb_set(
    policy_data,
    '{transfer_alt_bucket_mode}',
    '"separate"'
  ),
  '{provenance_verified_at}',
  to_jsonb(NOW()::text)
)
WHERE id = '84984b46-6f0a-4854-8ee1-a8136167af93';

-- Fix EMPIRE: add bucket_mode and provenance  
UPDATE institution_policy_packs
SET policy_data = jsonb_set(
  jsonb_set(
    policy_data,
    '{transfer_alt_bucket_mode}',
    '"separate"'
  ),
  '{provenance_verified_at}',
  to_jsonb(NOW()::text)
)
WHERE id = 'd3f68da2-b967-4e73-b6ce-75854f8f1dce';

-- Promote EXCELSIOR to active
UPDATE institution_policy_packs
SET status = 'active'
WHERE id = '84984b46-6f0a-4854-8ee1-a8136167af93';

-- Promote EMPIRE to active
UPDATE institution_policy_packs
SET status = 'active'
WHERE id = 'd3f68da2-b967-4e73-b6ce-75854f8f1dce';
-- Supersede empty/broken draft packs for WGU
UPDATE institution_policy_packs
SET status = 'superseded'
WHERE institution = 'WGU'
  AND status = 'draft'
  AND (
    policy_data IS NULL
    OR policy_data = '{}'::jsonb
    OR provenance_url IS NULL
    OR BTRIM(provenance_url) = ''
  )
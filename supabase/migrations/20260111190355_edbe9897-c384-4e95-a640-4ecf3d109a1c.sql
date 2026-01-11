-- Fix SNHU: remove unverified max_alt_credit, add bucket mode
UPDATE institution_policy_packs
SET policy_data = policy_data 
  - 'max_alt_credit'  -- Remove unverified alt cap
  || jsonb_build_object(
    'transfer_alt_bucket_mode', 'unknown',
    'provenance_excerpt', 'SNHU accepts up to 90 transfer credits toward bachelor''s - alt cap NOT explicitly defined in primary source',
    'provenance_note', 'max_alt_credit removed: only max_transfer_credits=90 is verified'
  )
WHERE institution = 'SNHU' AND status = 'active';

-- Update TESU/COSC with explicit separate bucket mode (already verified)
UPDATE institution_policy_packs
SET policy_data = policy_data || jsonb_build_object(
  'transfer_alt_bucket_mode', 'separate'
)
WHERE institution IN ('TESU', 'COSC') AND status = 'active';
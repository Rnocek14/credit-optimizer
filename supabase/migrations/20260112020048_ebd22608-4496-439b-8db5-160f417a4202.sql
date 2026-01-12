-- Activate WGU Policy Pack: Add provenance verification and flip to active
-- WGU uses 'separate' bucket mode: 90 transfer credits + 45 ALT credits (not combined)
UPDATE institution_policy_packs
SET 
  status = 'active',
  policy_data = policy_data || jsonb_build_object(
    'provenance_verified_at', now()::text,
    'transfer_alt_bucket_mode', 'separate',
    'verification_source', 'manual_audit_2026_01'
  ),
  updated_at = now()
WHERE id = '6a3ee96a-e856-4bb4-9d97-bfab85260ca7'
  AND institution = 'WGU';
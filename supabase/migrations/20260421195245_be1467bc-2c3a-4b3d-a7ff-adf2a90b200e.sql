-- Backfill max_alt_credit for separate-mode drafts
UPDATE institution_policy_packs ipp
SET 
  policy_data = ipp.policy_data || jsonb_build_object(
    'max_alt_credit', 
    COALESCE(
      NULLIF(ipp.policy_data->>'max_ace_nccrs_credits', '')::int,
      30
    )
  ),
  field_provenance = COALESCE(ipp.field_provenance, '{}'::jsonb) || jsonb_build_object(
    'max_alt_credit', jsonb_build_object(
      'source', CASE 
        WHEN NULLIF(ipp.policy_data->>'max_ace_nccrs_credits', '') IS NOT NULL THEN 'derived'
        ELSE 'auto_defaulted'
      END,
      'confidence', CASE 
        WHEN NULLIF(ipp.policy_data->>'max_ace_nccrs_credits', '') IS NOT NULL THEN 85
        ELSE 65
      END,
      'verification_method', CASE 
        WHEN NULLIF(ipp.policy_data->>'max_ace_nccrs_credits', '') IS NOT NULL THEN 'mirrored_from_ace_nccrs'
        ELSE 'us_alt_credit_default'
      END,
      'provenance_verified_at', now()::text,
      'derivation_basis', jsonb_build_object(
        'type', CASE 
          WHEN NULLIF(ipp.policy_data->>'max_ace_nccrs_credits', '') IS NOT NULL THEN 'ace_nccrs_mirror'
          ELSE 'us_default_30'
        END,
        'rationale', 'Most US schools cap alt credit at ~30; reviewer can override'
      )
    )
  ),
  updated_at = now()
WHERE ipp.status = 'draft'
  AND ipp.policy_data->>'transfer_alt_bucket_mode' = 'separate'
  AND (
    ipp.policy_data->>'max_alt_credit' IS NULL 
    OR NOT (ipp.policy_data->>'max_alt_credit' ~ '^\d+$')
    OR (ipp.policy_data->>'max_alt_credit')::int <= 0
  );

-- Re-run auto-promote to flip any newly-green packs to active
SELECT public.auto_promote_eligible_packs() AS final_run_result;
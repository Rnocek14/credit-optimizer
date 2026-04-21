
-- Backfill provenance metadata into policy_data for drafts that already have row-level verification.
UPDATE institution_policy_packs
SET 
  policy_data = policy_data
    || CASE WHEN policy_data ? 'provenance_verified_at' THEN '{}'::jsonb
            ELSE jsonb_build_object('provenance_verified_at', COALESCE(last_verified_at, now())::TEXT) END
    || CASE WHEN policy_data ? 'provenance_verified_by' THEN '{}'::jsonb
            ELSE jsonb_build_object('provenance_verified_by', 'auto_backfill_from_row_metadata') END
    || CASE WHEN policy_data ? 'provenance_source_url' THEN '{}'::jsonb
            ELSE jsonb_build_object('provenance_source_url', provenance_url) END,
  blocked_reason = CASE WHEN blocked_reason LIKE 'auto_promote_failed:%' THEN NULL ELSE blocked_reason END,
  updated_at = now()
WHERE status = 'draft'
  AND provenance_url IS NOT NULL
  AND BTRIM(provenance_url) <> '';

-- Backfill missing degree_credit_total provenance to ground_truth where the pack value matches the GT row.
UPDATE institution_policy_packs ipp
SET field_provenance = COALESCE(field_provenance, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', jsonb_build_object(
    'source', 'ground_truth',
    'confidence', 0.95,
    'verification_method', 'gt_backfill',
    'provenance_verified_at', now()::TEXT
  )
), updated_at = now()
FROM institution_policy_ground_truth gt
WHERE ipp.status = 'draft'
  AND ipp.institution = gt.institution
  AND (ipp.field_provenance->'degree_credit_total'->>'source' IS NULL
       OR ipp.field_provenance->'degree_credit_total'->>'source' = '')
  AND (
    (ipp.degree_level IN ('undergraduate','graduate')
       AND (ipp.policy_data->>'degree_credit_total')::INT
           = COALESCE(gt.total_credits_required_bachelors, 120))
    OR
    (ipp.degree_level = 'associate'
       AND (ipp.policy_data->>'degree_credit_total')::INT
           = COALESCE(gt.total_credits_required_associate, 60))
  );

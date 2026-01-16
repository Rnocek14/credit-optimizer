-- Fix has_ground_truth derivation to handle object provenance values (not just strings)
-- The field_provenance values are objects like: { "source": "ground_truth", "source_ref": "..." }
DROP VIEW IF EXISTS v_policy_pack_promotion_candidates;

CREATE OR REPLACE VIEW v_policy_pack_promotion_candidates AS
WITH ground_truth_check AS (
  SELECT 
    ipp.id,
    -- Check multiple sources for ground truth
    CASE 
      WHEN ipp.provenance_url IS NOT NULL THEN true
      WHEN ipp.last_verified_at IS NOT NULL THEN true
      WHEN (ipp.policy_data->>'provenance_verified_at') IS NOT NULL THEN true
      -- For field_provenance with object values: check if any value.source is in allowed set
      WHEN ipp.field_provenance IS NOT NULL AND EXISTS (
        SELECT 1 FROM jsonb_each(ipp.field_provenance) AS kv
        WHERE 
          -- Handle object provenance: { "source": "ground_truth", ... }
          (kv.value->>'source') IN ('ground_truth', 'human_override', 'catalog_pdf')
      ) THEN true
      ELSE false
    END AS has_ground_truth
  FROM institution_policy_packs ipp
),
missing_fields AS (
  SELECT 
    ipp.id,
    ARRAY_REMOVE(ARRAY[
      -- Critical fields
      CASE WHEN (ipp.policy_data->>'transfer_alt_bucket_mode') IS NULL 
           OR (ipp.policy_data->>'transfer_alt_bucket_mode') = 'unknown' 
        THEN 'transfer_alt_bucket_mode' END,
      CASE WHEN COALESCE(
          (ipp.policy_data->>'degree_credit_total')::int,
          (ipp.policy_data->>'total_credits')::int
        ) IS NULL OR COALESCE(
          (ipp.policy_data->>'degree_credit_total')::int,
          (ipp.policy_data->>'total_credits')::int
        ) <= 0
        THEN 'degree_credit_total' END,
      CASE WHEN (ipp.policy_data->>'residency_credits')::int IS NULL 
           OR (ipp.policy_data->>'residency_credits')::int <= 0
        THEN 'residency_credits' END,
      -- Conditional fields based on bucket mode
      CASE WHEN (ipp.policy_data->>'transfer_alt_bucket_mode') = 'separate' 
           AND ((ipp.policy_data->>'max_alt_credit')::int IS NULL 
                OR (ipp.policy_data->>'max_alt_credit')::int <= 0)
        THEN 'max_alt_credit (separate mode)' END,
      CASE WHEN (ipp.policy_data->>'transfer_alt_bucket_mode') = 'separate'
           AND (COALESCE(
             (ipp.policy_data->>'max_transfer_credits')::int,
             (ipp.policy_data->>'max_transfer')::int
           ) IS NULL OR COALESCE(
             (ipp.policy_data->>'max_transfer_credits')::int,
             (ipp.policy_data->>'max_transfer')::int
           ) <= 0)
        THEN 'max_transfer_credits (separate mode)' END,
      CASE WHEN (ipp.policy_data->>'transfer_alt_bucket_mode') = 'combined'
           AND (COALESCE(
             (ipp.policy_data->>'max_transfer_alt_combined_credits')::int,
             (ipp.policy_data->>'max_combined_transfer_alt')::int
           ) IS NULL OR COALESCE(
             (ipp.policy_data->>'max_transfer_alt_combined_credits')::int,
             (ipp.policy_data->>'max_combined_transfer_alt')::int
           ) <= 0)
        THEN 'max_transfer_alt_combined_credits (combined mode)' END
    ], NULL) AS missing_critical
  FROM institution_policy_packs ipp
)
SELECT 
  ipp.id AS pack_id,
  ipp.institution,
  ipp.status,
  COALESCE(ipp.confidence_score, 0) AS confidence_score,
  gtc.has_ground_truth,
  mf.missing_critical,
  -- Gate status derived from actual conditions
  CASE
    WHEN array_length(mf.missing_critical, 1) > 0 THEN 'red'
    WHEN ipp.blocked_reason IS NOT NULL THEN 'red'
    WHEN gtc.has_ground_truth AND COALESCE(ipp.confidence_score, 0) >= 80 THEN 'green'
    ELSE 'yellow'
  END AS gate_status,
  -- Promotability
  CASE
    WHEN ipp.status = 'active' THEN false
    WHEN array_length(mf.missing_critical, 1) > 0 THEN false
    WHEN ipp.blocked_reason IS NOT NULL THEN false
    ELSE true
  END AS is_promotable,
  ipp.blocked_reason,
  ipp.updated_at,
  -- Template counts
  (SELECT COUNT(*) FROM degree_templates dt WHERE dt.institution_code = ipp.institution AND dt.status = 'active') AS active_templates,
  (SELECT COUNT(*) FROM degree_templates dt WHERE dt.institution_code = ipp.institution AND dt.status = 'pending_review') AS pending_templates
FROM institution_policy_packs ipp
JOIN ground_truth_check gtc ON gtc.id = ipp.id
JOIN missing_fields mf ON mf.id = ipp.id
WHERE ipp.status != 'deprecated'
ORDER BY 
  CASE WHEN gtc.has_ground_truth AND array_length(mf.missing_critical, 1) IS NULL THEN 0 ELSE 1 END,
  COALESCE(ipp.confidence_score, 0) DESC,
  ipp.updated_at DESC;
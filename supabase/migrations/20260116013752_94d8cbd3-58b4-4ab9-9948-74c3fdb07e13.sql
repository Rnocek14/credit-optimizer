-- Fix v_policy_pack_promotion_candidates to derive ground truth from actual data
-- and mirror the real evaluatePolicyGate logic

DROP VIEW IF EXISTS v_policy_pack_promotion_candidates;

CREATE OR REPLACE VIEW v_policy_pack_promotion_candidates
WITH (security_invoker = on) AS
WITH pack_analysis AS (
  SELECT 
    ipp.id AS pack_id,
    ipp.institution AS institution_code,
    i.name AS institution_name,
    ipp.pack_scope AS program_code,
    ipp.degree_level,
    ipp.status,
    ipp.academic_year AS catalog_year,
    ipp.created_at,
    ipp.updated_at,
    ipp.promoted_at,
    ipp.stale,
    ipp.blocked_reason,
    ipp.policy_data,
    ipp.field_provenance,
    ipp.provenance_url,
    ipp.last_verified_at,
    ipp.confidence_score,
    
    -- Derive has_ground_truth from actual evidence (matches shared helper logic)
    CASE 
      WHEN ipp.provenance_url IS NOT NULL THEN true
      WHEN ipp.last_verified_at IS NOT NULL THEN true
      WHEN (ipp.policy_data->>'provenance_verified_at') IS NOT NULL THEN true
      WHEN ipp.field_provenance IS NOT NULL AND jsonb_typeof(ipp.field_provenance) = 'object' THEN
        -- Check if any field has ground_truth or human_override source
        EXISTS (
          SELECT 1 FROM jsonb_each_text(ipp.field_provenance) 
          WHERE value IN ('ground_truth', 'human_override', 'catalog_pdf')
        )
      ELSE false
    END AS has_ground_truth,
    
    -- Extract critical fields from policy_data (mirrors evaluatePolicyGate)
    ipp.policy_data->>'transfer_alt_bucket_mode' AS bucket_mode,
    COALESCE(
      (ipp.policy_data->>'degree_credit_total')::int,
      (ipp.policy_data->>'total_credits')::int
    ) AS total_credits,
    (ipp.policy_data->>'residency_credits')::int AS residency_credits,
    (ipp.policy_data->>'max_alt_credit')::int AS max_alt_credit,
    (ipp.policy_data->>'max_transfer_credits')::int AS max_transfer_credits,
    (ipp.policy_data->>'max_transfer_alt_combined_credits')::int AS max_combined_credits
  FROM institution_policy_packs ipp
  LEFT JOIN institutions i ON i.code = ipp.institution
),
gate_computed AS (
  SELECT 
    pa.*,
    -- Compute missing critical fields (mirrors evaluatePolicyGate exactly)
    ARRAY_REMOVE(ARRAY[
      CASE WHEN pa.bucket_mode IS NULL OR pa.bucket_mode = 'unknown' 
           THEN 'transfer_alt_bucket_mode' END,
      CASE WHEN pa.total_credits IS NULL OR pa.total_credits <= 0 
           THEN 'degree_credit_total' END,
      CASE WHEN pa.residency_credits IS NULL OR pa.residency_credits <= 0 
           THEN 'residency_credits' END,
      -- Conditional based on bucket mode
      CASE WHEN pa.bucket_mode = 'separate' AND (pa.max_alt_credit IS NULL OR pa.max_alt_credit <= 0)
           THEN 'max_alt_credit' END,
      CASE WHEN pa.bucket_mode = 'separate' AND (pa.max_transfer_credits IS NULL OR pa.max_transfer_credits <= 0)
           THEN 'max_transfer_credits' END,
      CASE WHEN pa.bucket_mode = 'combined' AND (pa.max_combined_credits IS NULL OR pa.max_combined_credits <= 0)
           THEN 'max_transfer_alt_combined_credits' END
    ], NULL) AS missing_critical
  FROM pack_analysis pa
)
SELECT 
  gc.pack_id,
  gc.institution_code,
  gc.institution_name,
  gc.program_code,
  gc.degree_level,
  gc.status,
  gc.has_ground_truth,
  gc.confidence_score,
  gc.catalog_year,
  gc.created_at,
  gc.updated_at,
  gc.promoted_at,
  gc.stale,
  gc.blocked_reason,
  gc.missing_critical,
  
  -- Gate status (mirrors evaluatePolicyGate exactly)
  CASE 
    WHEN gc.blocked_reason IS NOT NULL THEN 'red'
    WHEN array_length(gc.missing_critical, 1) > 0 THEN 'red'
    WHEN NOT gc.has_ground_truth THEN 'yellow'
    WHEN gc.confidence_score >= 80 THEN 'green'
    WHEN gc.confidence_score >= 50 THEN 'yellow'
    ELSE 'red'
  END AS gate_status,
  
  -- Promotion eligibility
  CASE 
    WHEN gc.status = 'active' THEN false -- Already promoted
    WHEN gc.blocked_reason IS NOT NULL THEN false -- Blocked
    WHEN array_length(gc.missing_critical, 1) > 0 THEN false -- Red gate
    ELSE true -- Green or yellow can be promoted
  END AS is_promotable,
  
  -- Auto-promotion eligibility (green gate only)
  CASE 
    WHEN gc.blocked_reason IS NOT NULL THEN false
    WHEN array_length(gc.missing_critical, 1) > 0 THEN false
    WHEN gc.has_ground_truth AND gc.confidence_score >= 80 THEN true
    ELSE false
  END AS is_auto_promotable,
  
  -- Reason for current state
  CASE 
    WHEN gc.status = 'active' THEN 'Already active'
    WHEN gc.blocked_reason IS NOT NULL THEN 'Blocked: ' || gc.blocked_reason
    WHEN array_length(gc.missing_critical, 1) > 0 THEN 
      'Missing critical: ' || array_to_string(gc.missing_critical, ', ')
    WHEN NOT gc.has_ground_truth THEN 'Can promote manually (no ground truth)'
    WHEN gc.confidence_score >= 80 THEN 'Ready for auto-promotion'
    WHEN gc.confidence_score >= 50 THEN 'Can promote manually (score < 80)'
    ELSE 'Score too low'
  END AS promotion_reason,
  
  -- Count of templates generated from this pack
  (
    SELECT COUNT(*) 
    FROM degree_templates dt 
    WHERE dt.institution_code = gc.institution_code 
  ) AS templates_count,
  
  -- Count of active templates
  (
    SELECT COUNT(*) 
    FROM degree_templates dt 
    WHERE dt.institution_code = gc.institution_code 
    AND dt.status = 'active'
  ) AS active_templates_count

FROM gate_computed gc
ORDER BY 
  CASE WHEN gc.status = 'draft' THEN 0 ELSE 1 END,
  CASE 
    WHEN gc.blocked_reason IS NOT NULL THEN 3
    WHEN array_length(gc.missing_critical, 1) > 0 THEN 2
    WHEN gc.has_ground_truth AND gc.confidence_score >= 80 THEN 0
    ELSE 1
  END,
  gc.confidence_score DESC NULLS LAST,
  gc.updated_at DESC;

COMMENT ON VIEW v_policy_pack_promotion_candidates IS 
'Promotion candidate view mirroring evaluatePolicyGate logic exactly.
has_ground_truth: derived from provenance_url, last_verified_at, policy_data.provenance_verified_at, or field_provenance sources.
missing_critical: computed from bucket_mode, total_credits, residency_credits, and conditional caps.
gate_status: red (missing critical or blocked), yellow (no ground truth or low score), green (verified + complete).';
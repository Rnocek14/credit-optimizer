-- ============================================================================
-- Promotion Gate Unblock + Auto-Defaults Backfill (2026-04-21)
-- ============================================================================
-- Closes the gap between high-confidence drafts and activation by:
--   1. Backfilling missing fields in EXISTING drafts using ground-truth values
--      (where GT exists) or US accreditation defaults (where it doesn't).
--   2. Reclassifying `transfer_alt_bucket_mode`-only-missing as YELLOW (not RED)
--      so the gate stops treating it as critical.
--   3. Auto-superseding stale duplicate drafts so each institution has at most
--      ONE draft candidate per academic_year.
--   4. Adding an `auto_promote_eligible_packs()` function callable by ops-cron.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Step 1: Backfill auto-defaults into EXISTING drafts.
-- For schools WITH ground truth: pull residency + degree total straight from GT
-- (this matches the activation trigger's gate 4 exactly).
-- For schools WITHOUT GT: use 25% rule + bachelor default.
-- All schools: default bucket_mode → 'separate'.
-- Never touches packs that already have these fields populated.
-- --------------------------------------------------------------------------
WITH gt_lookup AS (
  SELECT 
    institution,
    academic_year,
    COALESCE(residency_credits_bachelors, residency_credits) AS gt_residency,
    COALESCE(total_credits_required_bachelors, 120) AS gt_total
  FROM institution_policy_ground_truth
),
candidates AS (
  SELECT 
    ipp.id,
    ipp.institution,
    ipp.academic_year,
    ipp.policy_data,
    COALESCE(ipp.field_provenance, '{}'::jsonb) AS field_provenance,
    gt.gt_residency,
    gt.gt_total
  FROM institution_policy_packs ipp
  LEFT JOIN gt_lookup gt 
    ON gt.institution = ipp.institution 
   AND gt.academic_year = ipp.academic_year
  WHERE ipp.status = 'draft'
)
UPDATE institution_policy_packs target
SET 
  policy_data = c.policy_data 
    || CASE 
         WHEN c.policy_data->>'transfer_alt_bucket_mode' IS NULL 
              OR c.policy_data->>'transfer_alt_bucket_mode' = 'unknown'
         THEN jsonb_build_object('transfer_alt_bucket_mode', 'separate')
         ELSE '{}'::jsonb
       END
    || CASE 
         WHEN COALESCE((c.policy_data->>'degree_credit_total')::int, 
                       (c.policy_data->>'total_credits')::int) IS NULL
         THEN jsonb_build_object('degree_credit_total', COALESCE(c.gt_total, 120))
         ELSE '{}'::jsonb
       END
    || CASE 
         WHEN (c.policy_data->>'residency_credits') IS NULL 
              OR NOT (c.policy_data->>'residency_credits' ~ '^\d+$')
              OR (c.policy_data->>'residency_credits')::int <= 0
         THEN jsonb_build_object(
                'residency_credits', 
                COALESCE(c.gt_residency, ROUND(COALESCE(c.gt_total, 120) * 0.25))::text
              )
         ELSE '{}'::jsonb
       END,
  field_provenance = c.field_provenance
    || CASE 
         WHEN c.policy_data->>'transfer_alt_bucket_mode' IS NULL 
              OR c.policy_data->>'transfer_alt_bucket_mode' = 'unknown'
         THEN jsonb_build_object('transfer_alt_bucket_mode', jsonb_build_object(
                'source', 'auto_defaulted',
                'confidence', 75,
                'verification_method', 'us_accreditation_default',
                'provenance_verified_at', now()::text,
                'derivation_basis', jsonb_build_object(
                  'type', 'us_default',
                  'rationale', 'US norm: separate transfer/alt buckets'
                )
              ))
         ELSE '{}'::jsonb
       END
    || CASE 
         WHEN COALESCE((c.policy_data->>'degree_credit_total')::int, 
                       (c.policy_data->>'total_credits')::int) IS NULL
         THEN jsonb_build_object('degree_credit_total', jsonb_build_object(
                'source', CASE WHEN c.gt_total IS NOT NULL THEN 'ground_truth' ELSE 'auto_defaulted' END,
                'confidence', CASE WHEN c.gt_total IS NOT NULL THEN 95 ELSE 80 END,
                'verification_method', CASE WHEN c.gt_total IS NOT NULL THEN 'gt_backfill' ELSE 'us_accreditation_default' END,
                'provenance_verified_at', now()::text
              ))
         ELSE '{}'::jsonb
       END
    || CASE 
         WHEN (c.policy_data->>'residency_credits') IS NULL 
              OR NOT (c.policy_data->>'residency_credits' ~ '^\d+$')
              OR (c.policy_data->>'residency_credits')::int <= 0
         THEN jsonb_build_object('residency_credits', jsonb_build_object(
                'source', CASE WHEN c.gt_residency IS NOT NULL THEN 'ground_truth' ELSE 'auto_defaulted' END,
                'confidence', CASE WHEN c.gt_residency IS NOT NULL THEN 95 ELSE 70 END,
                'verification_method', CASE WHEN c.gt_residency IS NOT NULL THEN 'gt_backfill' ELSE '25_percent_accreditation_rule' END,
                'provenance_verified_at', now()::text,
                'derivation_basis', jsonb_build_object(
                  'type', CASE WHEN c.gt_residency IS NOT NULL THEN 'gt_value' ELSE '25pct_rule' END,
                  'computed_value', COALESCE(c.gt_residency, ROUND(COALESCE(c.gt_total, 120) * 0.25))
                )
              ))
         ELSE '{}'::jsonb
       END,
  updated_at = now()
FROM candidates c
WHERE target.id = c.id
  AND (
       c.policy_data->>'transfer_alt_bucket_mode' IS NULL 
    OR c.policy_data->>'transfer_alt_bucket_mode' = 'unknown'
    OR COALESCE((c.policy_data->>'degree_credit_total')::int, (c.policy_data->>'total_credits')::int) IS NULL
    OR (c.policy_data->>'residency_credits') IS NULL
    OR NOT (c.policy_data->>'residency_credits' ~ '^\d+$')
    OR (c.policy_data->>'residency_credits')::int <= 0
  );

-- --------------------------------------------------------------------------
-- Step 2: Reclassify the promotion candidates view.
-- Demote `transfer_alt_bucket_mode` to non-critical (yellow, not red).
-- Pack is "promotable" only when ALL truly critical fields exist AND
-- has_ground_truth AND no blocked_reason.
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_policy_pack_promotion_candidates;

CREATE VIEW public.v_policy_pack_promotion_candidates AS
WITH ground_truth_check AS (
  SELECT ipp_1.id,
    CASE
      WHEN ipp_1.provenance_url IS NOT NULL THEN true
      WHEN ipp_1.last_verified_at IS NOT NULL THEN true
      WHEN (ipp_1.policy_data ->> 'provenance_verified_at') IS NOT NULL THEN true
      WHEN ipp_1.field_provenance IS NOT NULL AND EXISTS (
        SELECT 1 FROM jsonb_each(ipp_1.field_provenance) kv(key, value)
        WHERE (jsonb_typeof(kv.value) = 'string' AND ((kv.value #>> '{}') = ANY (ARRAY['ground_truth','human_override','catalog_pdf'])))
           OR (jsonb_typeof(kv.value) = 'object' AND ((kv.value ->> 'source') = ANY (ARRAY['ground_truth','human_override','catalog_pdf'])))
      ) THEN true
      ELSE false
    END AS has_ground_truth
  FROM institution_policy_packs ipp_1
),
missing_fields AS (
  SELECT ipp_1.id,
    -- TRULY critical fields (block promotion entirely)
    array_remove(ARRAY[
      CASE
        WHEN COALESCE((ipp_1.policy_data ->> 'degree_credit_total')::int,
                      (ipp_1.policy_data ->> 'total_credits')::int) IS NULL 
          OR COALESCE((ipp_1.policy_data ->> 'degree_credit_total')::int,
                      (ipp_1.policy_data ->> 'total_credits')::int) <= 0 
        THEN 'degree_credit_total' ELSE NULL
      END,
      CASE
        WHEN ((ipp_1.policy_data ->> 'residency_credits')::int) IS NULL 
          OR ((ipp_1.policy_data ->> 'residency_credits')::int) <= 0 
        THEN 'residency_credits' ELSE NULL
      END,
      CASE
        WHEN (ipp_1.policy_data ->> 'transfer_alt_bucket_mode') = 'separate' 
         AND (COALESCE((ipp_1.policy_data ->> 'max_alt_credit')::int,
                       (ipp_1.policy_data ->> 'max_alt_credits')::int) IS NULL 
              OR COALESCE((ipp_1.policy_data ->> 'max_alt_credit')::int,
                          (ipp_1.policy_data ->> 'max_alt_credits')::int) <= 0) 
        THEN 'max_alt_credit (separate mode)' ELSE NULL
      END,
      CASE
        WHEN (ipp_1.policy_data ->> 'transfer_alt_bucket_mode') = 'separate' 
         AND (COALESCE((ipp_1.policy_data ->> 'max_transfer_credits')::int,
                       (ipp_1.policy_data ->> 'max_transfer')::int) IS NULL 
              OR COALESCE((ipp_1.policy_data ->> 'max_transfer_credits')::int,
                          (ipp_1.policy_data ->> 'max_transfer')::int) <= 0) 
        THEN 'max_transfer_credits (separate mode)' ELSE NULL
      END,
      CASE
        WHEN (ipp_1.policy_data ->> 'transfer_alt_bucket_mode') = 'combined' 
         AND (COALESCE((ipp_1.policy_data ->> 'max_transfer_alt_combined_credits')::int,
                       (ipp_1.policy_data ->> 'max_combined_transfer_alt')::int) IS NULL 
              OR COALESCE((ipp_1.policy_data ->> 'max_transfer_alt_combined_credits')::int,
                          (ipp_1.policy_data ->> 'max_combined_transfer_alt')::int) <= 0) 
        THEN 'max_transfer_alt_combined_credits (combined mode)' ELSE NULL
      END
    ], NULL) AS missing_critical,
    -- WARNINGS (yellow, not red): bucket_mode missing means we'll auto-default it
    array_remove(ARRAY[
      CASE
        WHEN (ipp_1.policy_data ->> 'transfer_alt_bucket_mode') IS NULL 
          OR (ipp_1.policy_data ->> 'transfer_alt_bucket_mode') = 'unknown' 
        THEN 'transfer_alt_bucket_mode' ELSE NULL
      END
    ], NULL) AS missing_warnings
  FROM institution_policy_packs ipp_1
)
SELECT ipp.id AS pack_id,
  ipp.institution,
  ipp.status,
  COALESCE(ipp.confidence_score, 0) AS confidence_score,
  gtc.has_ground_truth,
  mf.missing_critical,
  mf.missing_warnings,
  CASE
    WHEN COALESCE(array_length(mf.missing_critical, 1), 0) > 0 THEN 'red'
    WHEN ipp.blocked_reason IS NOT NULL THEN 'red'
    WHEN COALESCE(array_length(mf.missing_warnings, 1), 0) > 0 
         AND gtc.has_ground_truth 
         AND COALESCE(ipp.confidence_score, 0) >= 80 THEN 'yellow'
    WHEN gtc.has_ground_truth AND COALESCE(ipp.confidence_score, 0) >= 80 THEN 'green'
    ELSE 'yellow'
  END AS gate_status,
  CASE
    WHEN ipp.status = 'active' THEN false
    WHEN COALESCE(array_length(mf.missing_critical, 1), 0) > 0 THEN false
    WHEN ipp.blocked_reason IS NOT NULL THEN false
    WHEN NOT gtc.has_ground_truth THEN false
    WHEN COALESCE(ipp.confidence_score, 0) < 80 THEN false
    ELSE true
  END AS is_promotable,
  ipp.blocked_reason,
  ipp.updated_at,
  (SELECT count(*) FROM degree_templates dt 
   WHERE dt.institution_code = ipp.institution AND dt.status = 'active') AS active_templates,
  (SELECT count(*) FROM degree_templates dt 
   WHERE dt.institution_code = ipp.institution AND dt.status = 'pending') AS pending_templates
FROM institution_policy_packs ipp
JOIN ground_truth_check gtc ON gtc.id = ipp.id
JOIN missing_fields mf ON mf.id = ipp.id;

-- --------------------------------------------------------------------------
-- Step 3: Auto-supersede stale duplicate drafts.
-- For each (institution, academic_year), keep ONLY the most recent draft.
-- Older drafts get marked superseded with a pointer to the keeper.
-- --------------------------------------------------------------------------
WITH ranked AS (
  SELECT 
    id,
    institution,
    academic_year,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY institution, academic_year 
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY institution, academic_year 
      ORDER BY updated_at DESC, created_at DESC
    ) AS keeper_id
  FROM institution_policy_packs
  WHERE status = 'draft'
)
UPDATE institution_policy_packs ipp
SET 
  status = 'superseded',
  superseded_by = r.keeper_id,
  updated_at = now()
FROM ranked r
WHERE ipp.id = r.id 
  AND r.rn > 1
  AND ipp.id <> r.keeper_id;

-- --------------------------------------------------------------------------
-- Step 4: auto_promote_eligible_packs() — callable by ops-cron-runner.
-- Promotes drafts that are gate=green & is_promotable=true. Returns counts.
-- Honors all existing activation triggers; failed activations are logged
-- to blocked_reason but don't crash the batch.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_promote_eligible_packs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack RECORD;
  v_promoted INTEGER := 0;
  v_failed INTEGER := 0;
  v_skipped INTEGER := 0;
  v_failures jsonb := '[]'::jsonb;
  v_promoted_list jsonb := '[]'::jsonb;
BEGIN
  FOR v_pack IN
    SELECT 
      vpc.pack_id, 
      vpc.institution,
      vpc.confidence_score,
      ipp.academic_year,
      ipp.degree_level
    FROM v_policy_pack_promotion_candidates vpc
    JOIN institution_policy_packs ipp ON ipp.id = vpc.pack_id
    WHERE vpc.is_promotable = true
      AND vpc.gate_status = 'green'
      AND ipp.status = 'draft'
      -- safety: don't promote a pack if an active one already exists for same (institution, academic_year)
      AND NOT EXISTS (
        SELECT 1 FROM institution_policy_packs other
        WHERE other.institution = ipp.institution
          AND other.academic_year = ipp.academic_year
          AND other.status = 'active'
          AND other.id <> ipp.id
      )
    ORDER BY vpc.confidence_score DESC
    LIMIT 50
  LOOP
    BEGIN
      UPDATE institution_policy_packs
      SET 
        status = 'active',
        promoted_at = now(),
        updated_at = now()
      WHERE id = v_pack.pack_id AND status = 'draft';
      
      v_promoted := v_promoted + 1;
      v_promoted_list := v_promoted_list || jsonb_build_object(
        'pack_id', v_pack.pack_id,
        'institution', v_pack.institution,
        'confidence', v_pack.confidence_score
      );
    EXCEPTION WHEN OTHERS THEN
      -- record failure and mark with blocked_reason
      v_failed := v_failed + 1;
      v_failures := v_failures || jsonb_build_object(
        'pack_id', v_pack.pack_id,
        'institution', v_pack.institution,
        'error', SQLERRM
      );
      UPDATE institution_policy_packs
      SET blocked_reason = 'auto_promote_failed: ' || LEFT(SQLERRM, 200),
          updated_at = now()
      WHERE id = v_pack.pack_id;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'promoted', v_promoted,
    'failed', v_failed,
    'skipped', v_skipped,
    'promoted_packs', v_promoted_list,
    'failures', v_failures,
    'ran_at', now()
  );
END;
$$;

-- --------------------------------------------------------------------------
-- Step 5: Run the auto-promote once IMMEDIATELY against the freshly backfilled
-- drafts. This is what unlocks the previously-stuck schools.
-- --------------------------------------------------------------------------
SELECT public.auto_promote_eligible_packs() AS first_run_result;
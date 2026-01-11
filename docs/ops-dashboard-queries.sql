-- =============================================================================
-- OPS DASHBOARD QUERIES: Truth & Trust Contract Verification
-- =============================================================================
-- These queries mirror the TypeScript gating logic in integrityScanner.ts
-- Use to sanity-check code output vs DB reality
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) ANCHOR CONTRACT DASHBOARD (Active Packs Only)
-- Shows: bucket mode, cap fields, provenance freshness, computed anchor_status
-- -----------------------------------------------------------------------------

WITH active AS (
  SELECT
    institution,
    status,
    policy_data,
    (policy_data->>'transfer_alt_bucket_mode') AS bucket_mode,
    (policy_data->>'degree_credit_total')::int AS degree_total,
    (policy_data->>'residency_credits')::int AS residency_credits,
    (policy_data->>'max_transfer_credits')::int AS max_transfer_credits,
    (policy_data->>'max_alt_credit')::int AS max_alt_credit,
    (policy_data->>'max_transfer_alt_combined_credits')::int AS combined_cap,
    (policy_data->'grade_rules'->>'min_transfer_grade') AS min_transfer_grade,
    (policy_data->>'capstone_in_residence')::boolean AS capstone_in_residence,
    (policy_data->>'provenance_verified_at')::timestamptz AS provenance_verified_at
  FROM institution_policy_packs
  WHERE status = 'active'
),
eval AS (
  SELECT
    a.*,
    -- Freshness
    EXTRACT(DAY FROM (NOW() - a.provenance_verified_at))::int AS days_since_verified,

    -- Gate checks (mirror TS ordering logic in checkAnchorEligibility)
    CASE
      WHEN COALESCE(a.bucket_mode, 'unknown') NOT IN ('separate','combined')
        THEN 'unknown_bucket_mode'

      WHEN a.bucket_mode = 'separate' AND a.max_alt_credit IS NULL
        THEN 'missing_mode_caps'
      WHEN a.bucket_mode = 'combined' AND a.combined_cap IS NULL
        THEN 'missing_mode_caps'

      WHEN a.residency_credits IS NULL
        OR a.max_transfer_credits IS NULL
        OR a.degree_total IS NULL
        OR a.capstone_in_residence IS NULL
        OR a.min_transfer_grade IS NULL
        THEN 'missing_fields'

      WHEN a.provenance_verified_at IS NULL
        THEN 'missing_provenance_verified_at'

      WHEN (NOW() - a.provenance_verified_at) > INTERVAL '180 days'
        THEN 'stale_provenance'

      ELSE NULL
    END AS blocked_reason
  FROM active a
)
SELECT
  institution,
  bucket_mode,
  degree_total,
  residency_credits,
  max_transfer_credits,
  max_alt_credit,
  combined_cap,
  min_transfer_grade,
  capstone_in_residence,
  provenance_verified_at,
  days_since_verified,
  CASE WHEN blocked_reason IS NULL THEN '✅ SELECTABLE' ELSE '❌ BLOCKED' END AS anchor_status,
  blocked_reason
FROM eval
ORDER BY
  CASE WHEN blocked_reason IS NULL THEN 0 ELSE 1 END,
  institution;


-- -----------------------------------------------------------------------------
-- 2) SUMMARY / HISTOGRAM + SEV MAPPING (Active Packs)
-- Quick "red/yellow" summary for ops
-- -----------------------------------------------------------------------------

WITH active AS (
  SELECT
    institution,
    (policy_data->>'transfer_alt_bucket_mode') AS bucket_mode,
    (policy_data->>'max_alt_credit')::int AS max_alt_credit,
    (policy_data->>'max_transfer_alt_combined_credits')::int AS combined_cap,
    (policy_data->>'degree_credit_total')::int AS degree_total,
    (policy_data->>'residency_credits')::int AS residency_credits,
    (policy_data->>'max_transfer_credits')::int AS max_transfer_credits,
    (policy_data->'grade_rules'->>'min_transfer_grade') AS min_transfer_grade,
    (policy_data->>'capstone_in_residence')::boolean AS capstone_in_residence,
    (policy_data->>'provenance_verified_at')::timestamptz AS provenance_verified_at
  FROM institution_policy_packs
  WHERE status = 'active'
),
reasons AS (
  SELECT
    *,
    CASE
      WHEN COALESCE(bucket_mode, 'unknown') NOT IN ('separate','combined')
        THEN 'unknown_bucket_mode'

      WHEN bucket_mode = 'separate' AND max_alt_credit IS NULL
        THEN 'missing_mode_caps'
      WHEN bucket_mode = 'combined' AND combined_cap IS NULL
        THEN 'missing_mode_caps'

      WHEN residency_credits IS NULL
        OR max_transfer_credits IS NULL
        OR degree_total IS NULL
        OR capstone_in_residence IS NULL
        OR min_transfer_grade IS NULL
        THEN 'missing_fields'

      WHEN provenance_verified_at IS NULL
        THEN 'missing_provenance_verified_at'

      WHEN (NOW() - provenance_verified_at) > INTERVAL '180 days'
        THEN 'stale_provenance'

      ELSE NULL
    END AS blocked_reason
  FROM active
),
sev AS (
  SELECT
    blocked_reason,
    COUNT(*) AS count,
    CASE
      WHEN blocked_reason = 'stale_provenance' THEN 'SEV1'
      WHEN blocked_reason IS NULL THEN NULL
      ELSE 'SEV0'
    END AS severity
  FROM reasons
  GROUP BY blocked_reason
)
SELECT
  COALESCE(blocked_reason, 'selectable') AS bucket,
  severity,
  count
FROM sev
ORDER BY
  CASE
    WHEN severity = 'SEV0' THEN 0
    WHEN severity = 'SEV1' THEN 1
    WHEN severity IS NULL THEN 2
    ELSE 3
  END,
  bucket;


-- -----------------------------------------------------------------------------
-- 3) DRAFT ELIGIBILITY PREVIEW
-- Shows what drafts need to become eligible (matches draftEligibilityPreview)
-- -----------------------------------------------------------------------------

WITH drafts AS (
  SELECT
    institution,
    status,
    policy_data,
    (policy_data->>'transfer_alt_bucket_mode') AS bucket_mode,
    (policy_data->>'degree_credit_total')::int AS degree_total,
    (policy_data->>'residency_credits')::int AS residency_credits,
    (policy_data->>'max_transfer_credits')::int AS max_transfer_credits,
    (policy_data->>'max_alt_credit')::int AS max_alt_credit,
    (policy_data->>'max_transfer_alt_combined_credits')::int AS combined_cap,
    (policy_data->'grade_rules'->>'min_transfer_grade') AS min_transfer_grade,
    (policy_data->>'capstone_in_residence')::boolean AS capstone_in_residence,
    (policy_data->>'provenance_verified_at')::timestamptz AS provenance_verified_at
  FROM institution_policy_packs
  WHERE status <> 'active'
),
eval AS (
  SELECT
    d.*,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(d.bucket_mode,'unknown') NOT IN ('separate','combined') THEN 'transfer_alt_bucket_mode' END,
      CASE WHEN d.bucket_mode = 'separate' AND d.max_alt_credit IS NULL THEN 'max_alt_credit' END,
      CASE WHEN d.bucket_mode = 'combined' AND d.combined_cap IS NULL THEN 'max_transfer_alt_combined_credits' END,
      CASE WHEN d.residency_credits IS NULL THEN 'residency_credits' END,
      CASE WHEN d.max_transfer_credits IS NULL THEN 'max_transfer_credits' END,
      CASE WHEN d.degree_total IS NULL THEN 'degree_credit_total' END,
      CASE WHEN d.capstone_in_residence IS NULL THEN 'capstone_in_residence' END,
      CASE WHEN d.min_transfer_grade IS NULL THEN 'grade_rules.min_transfer_grade' END,
      CASE WHEN d.provenance_verified_at IS NULL THEN 'provenance_verified_at' END
    ], NULL) AS missing_fields
  FROM drafts d
)
SELECT
  institution,
  status,
  bucket_mode,
  missing_fields
FROM eval
ORDER BY status, institution;


-- -----------------------------------------------------------------------------
-- EXPECTED RESULTS:
-- -----------------------------------------------------------------------------
-- Query 1: TESU/COSC should show ✅ SELECTABLE, blocked_reason = NULL
--          If something's off: ❌ BLOCKED with exact reason matching TS gating
--
-- Query 2: Quick histogram of selectable vs blocked by reason + severity
--          SEV0 = contract violation (shouldn't happen for active)
--          SEV1 = staleness (needs re-verification)
--
-- Query 3: Shows drafts with their missing fields for operator workflow
-- -----------------------------------------------------------------------------

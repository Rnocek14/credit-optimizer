-- Rebuild the UI-facing view to include rule_granularity and evidence_presence flags
-- WITHOUT changing core freshness semantics.
--
-- Heuristic goals:
-- 1) Only label something as 'policy' when we have strong evidence it is not a course→course mapping.
-- 2) Keep everything else as 'course_map' (even if incomplete), so we don't mislabel mappings.
-- 3) 'incomplete' = one side of mapping missing (could be policy OR incomplete data)

CREATE OR REPLACE VIEW transfer_rules_with_freshness AS
SELECT
  r.*,
  f.freshness_status,
  f.days_since_verified,
  f.ttl_days,

  -- Verification kind (explicit vs inferred vs never)
  CASE
    WHEN r.last_verified_at IS NULL THEN 'never_verified'
    WHEN r.last_verified_at_inferred THEN 'inferred'
    ELSE 'explicit'
  END AS verification_kind,

  -- Evidence presence for UI copy
  CASE
    WHEN NULLIF(BTRIM(r.evidence_url), '') IS NULL THEN 'none'
    ELSE 'link'
  END AS evidence_presence,

  -- Granularity classifier (conservative 3-bucket)
  CASE
    -- Strong signal: missing one side of the mapping → not a specific course-map
    WHEN NULLIF(BTRIM(r.target_course_code), '') IS NULL
      OR NULLIF(BTRIM(r.source_course_code), '') IS NULL
      THEN
        -- If *both* sides missing, it's almost certainly policy/metadata
        CASE
          WHEN NULLIF(BTRIM(r.target_course_code), '') IS NULL
           AND NULLIF(BTRIM(r.source_course_code), '') IS NULL
            THEN 'policy'
          -- If only one side missing, this could be policy OR an incomplete map
          ELSE 'incomplete'
        END
    -- If both codes exist, treat as course map even if evidence is missing
    ELSE 'course_map'
  END AS rule_granularity,

  -- Helps UI decide why something is "unknown"
  CASE
    WHEN f.freshness_status = 'unknown' AND NULLIF(BTRIM(r.evidence_url), '') IS NULL
      THEN
        CASE
          WHEN (NULLIF(BTRIM(r.target_course_code), '') IS NULL
             OR NULLIF(BTRIM(r.source_course_code), '') IS NULL)
            THEN 'no_evidence_link_policy_or_incomplete'
          ELSE 'no_evidence_link'
        END
    WHEN f.freshness_status = 'unknown'
      THEN 'untyped_or_missing_evidence_type'
    ELSE NULL
  END AS unknown_reason

FROM credit_transfer_rules r
JOIN transfer_rule_freshness f ON f.id = r.id;

COMMENT ON VIEW transfer_rules_with_freshness IS
  'Credit transfer rules joined with server-side freshness + UI helper flags. rule_granularity: course_map|policy|incomplete (conservative). evidence_presence: link|none.';
-- Suffix-match allowlist in promote_eligible_edges()
-- This allows tesu.edu to match www.tesu.edu, catalog.tesu.edu, etc.

CREATE OR REPLACE FUNCTION public.promote_eligible_edges(
  p_min_confidence numeric DEFAULT 0.85,
  p_min_evidence_count int DEFAULT 1,
  p_require_allowlisted_domain boolean DEFAULT true,
  p_limit int DEFAULT 200,
  p_dry_run boolean DEFAULT false,
  p_promoted_by text DEFAULT 'auto:ops-cron-runner',
  p_reason text DEFAULT 'Auto-promotion: evidence + confidence thresholds met'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_promoted int := 0;
  v_skipped_conflict int := 0;
  v_skipped_allowlist int := 0;
  v_skipped_evidence int := 0;
  v_skipped_confidence int := 0;
  v_rows jsonb := '[]'::jsonb;
  v_would_promote int := 0;
BEGIN
  /*
    Eligibility:
      - inferred edges only
      - confidence >= p_min_confidence
      - has >= p_min_evidence_count evidence rows with non-empty URL
      - (optional) evidence domain allowlisted (suffix match)
      - no existing VERIFIED edge for same key
    Action (reversible):
      - insert VERIFIED copy
      - supersede original inferred edge with superseded_by_edge_id
  */

  -- =========================================================
  -- Compute skipped reasons (using suffix-match allowlist)
  -- =========================================================
  SELECT
    COUNT(*) FILTER (WHERE fail_reason = 'LOW_CONFIDENCE'),
    COUNT(*) FILTER (WHERE fail_reason = 'INSUFFICIENT_EVIDENCE'),
    COUNT(*) FILTER (WHERE fail_reason = 'DOMAIN_NOT_ALLOWLISTED')
  INTO v_skipped_confidence, v_skipped_evidence, v_skipped_allowlist
  FROM (
    WITH eligible AS (
      SELECT
        e.id,
        e.confidence,
        COUNT(ev.id) FILTER (WHERE ev.evidence_url IS NOT NULL AND btrim(ev.evidence_url) <> '') AS evidence_count,
        BOOL_OR(coalesce(a.is_allowed, false)) AS any_allowlisted
      FROM public.institution_transfer_edges e
      LEFT JOIN public.institution_transfer_edge_evidence ev
        ON ev.edge_id = e.id
      LEFT JOIN public.transfer_evidence_domain_allowlist a
        ON a.is_allowed = true
       AND (
         lower(ev.evidence_domain) = a.domain
         OR lower(ev.evidence_domain) LIKE '%.' || a.domain
       )
      WHERE e.verification_status = 'inferred'
        AND e.superseded_by_edge_id IS NULL
      GROUP BY e.id, e.confidence
    )
    SELECT
      CASE
        WHEN confidence IS NULL OR confidence < p_min_confidence THEN 'LOW_CONFIDENCE'
        WHEN evidence_count < p_min_evidence_count THEN 'INSUFFICIENT_EVIDENCE'
        WHEN p_require_allowlisted_domain AND NOT coalesce(any_allowlisted, false) THEN 'DOMAIN_NOT_ALLOWLISTED'
        ELSE NULL
      END AS fail_reason
    FROM eligible
  ) z
  WHERE fail_reason IS NOT NULL;

  -- =========================================================
  -- Count conflicts among otherwise-eligible candidates
  -- =========================================================
  WITH eligible AS (
    SELECT
      e.id,
      e.from_entity_type,
      e.from_entity_id,
      e.to_institution,
      e.acceptance_scope,
      e.confidence,
      COUNT(ev.id) FILTER (WHERE ev.evidence_url IS NOT NULL AND btrim(ev.evidence_url) <> '') AS evidence_count,
      BOOL_OR(coalesce(a.is_allowed, false)) AS any_allowlisted
    FROM public.institution_transfer_edges e
    LEFT JOIN public.institution_transfer_edge_evidence ev ON ev.edge_id = e.id
    LEFT JOIN public.transfer_evidence_domain_allowlist a
      ON a.is_allowed = true
     AND (
       lower(ev.evidence_domain) = a.domain
       OR lower(ev.evidence_domain) LIKE '%.' || a.domain
     )
    WHERE e.verification_status = 'inferred'
      AND e.superseded_by_edge_id IS NULL
    GROUP BY e.id
  ),
  candidates AS (
    SELECT *
    FROM eligible
    WHERE confidence IS NOT NULL
      AND confidence >= p_min_confidence
      AND evidence_count >= p_min_evidence_count
      AND (NOT p_require_allowlisted_domain OR coalesce(any_allowlisted, false))
  )
  SELECT COUNT(*)
  INTO v_skipped_conflict
  FROM candidates c
  WHERE EXISTS (
    SELECT 1
    FROM public.institution_transfer_edges v
    WHERE v.from_entity_type = c.from_entity_type
      AND upper(trim(v.from_entity_id)) = upper(trim(c.from_entity_id))
      AND v.to_institution = c.to_institution
      AND v.acceptance_scope = c.acceptance_scope
      AND v.verification_status = 'verified'
      AND v.superseded_by_edge_id IS NULL
  );

  -- =========================================================
  -- Count would-promote (dry run)
  -- =========================================================
  WITH eligible AS (
    SELECT
      e.id,
      e.from_entity_type,
      e.from_entity_id,
      e.to_institution,
      e.acceptance_scope,
      e.confidence,
      COUNT(ev.id) FILTER (WHERE ev.evidence_url IS NOT NULL AND btrim(ev.evidence_url) <> '') AS evidence_count,
      BOOL_OR(coalesce(a.is_allowed, false)) AS any_allowlisted
    FROM public.institution_transfer_edges e
    LEFT JOIN public.institution_transfer_edge_evidence ev ON ev.edge_id = e.id
    LEFT JOIN public.transfer_evidence_domain_allowlist a
      ON a.is_allowed = true
     AND (
       lower(ev.evidence_domain) = a.domain
       OR lower(ev.evidence_domain) LIKE '%.' || a.domain
     )
    WHERE e.verification_status = 'inferred'
      AND e.superseded_by_edge_id IS NULL
    GROUP BY e.id
  )
  SELECT COUNT(*)
  INTO v_would_promote
  FROM eligible el
  WHERE el.confidence IS NOT NULL
    AND el.confidence >= p_min_confidence
    AND el.evidence_count >= p_min_evidence_count
    AND (NOT p_require_allowlisted_domain OR coalesce(el.any_allowlisted, false))
    AND NOT EXISTS (
      SELECT 1 FROM public.institution_transfer_edges v
      WHERE v.from_entity_type = el.from_entity_type
        AND upper(trim(v.from_entity_id)) = upper(trim(el.from_entity_id))
        AND v.to_institution = el.to_institution
        AND v.acceptance_scope = el.acceptance_scope
        AND v.verification_status = 'verified'
        AND v.superseded_by_edge_id IS NULL
    );

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'generated_at', v_now,
      'thresholds', jsonb_build_object(
        'min_confidence', p_min_confidence,
        'min_evidence_count', p_min_evidence_count,
        'require_allowlisted_domain', p_require_allowlisted_domain,
        'limit', p_limit
      ),
      'would_promote_count', LEAST(v_would_promote, p_limit),
      'total_eligible', v_would_promote,
      'skips', jsonb_build_object(
        'low_confidence', v_skipped_confidence,
        'insufficient_evidence', v_skipped_evidence,
        'domain_not_allowlisted', v_skipped_allowlist,
        'conflict_with_existing_verified', v_skipped_conflict
      )
    );
  END IF;

  -- =========================================================
  -- REAL PROMOTION
  -- =========================================================
  WITH eligible AS (
    SELECT
      e.*,
      COUNT(ev.id) FILTER (WHERE ev.evidence_url IS NOT NULL AND btrim(ev.evidence_url) <> '') AS evidence_count,
      BOOL_OR(coalesce(a.is_allowed, false)) AS any_allowlisted
    FROM public.institution_transfer_edges e
    LEFT JOIN public.institution_transfer_edge_evidence ev ON ev.edge_id = e.id
    LEFT JOIN public.transfer_evidence_domain_allowlist a
      ON a.is_allowed = true
     AND (
       lower(ev.evidence_domain) = a.domain
       OR lower(ev.evidence_domain) LIKE '%.' || a.domain
     )
    WHERE e.verification_status = 'inferred'
      AND e.superseded_by_edge_id IS NULL
    GROUP BY e.id
  ),
  candidates AS (
    SELECT *
    FROM eligible
    WHERE confidence IS NOT NULL
      AND confidence >= p_min_confidence
      AND evidence_count >= p_min_evidence_count
      AND (NOT p_require_allowlisted_domain OR coalesce(any_allowlisted, false))
    ORDER BY confidence DESC, evidence_count DESC, updated_at DESC NULLS LAST, created_at DESC
    LIMIT p_limit
  ),
  to_promote AS (
    SELECT c.*
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.institution_transfer_edges v
      WHERE v.from_entity_type = c.from_entity_type
        AND upper(trim(v.from_entity_id)) = upper(trim(c.from_entity_id))
        AND v.to_institution = c.to_institution
        AND v.acceptance_scope = c.acceptance_scope
        AND v.verification_status = 'verified'
        AND v.superseded_by_edge_id IS NULL
    )
  ),
  inserted AS (
    INSERT INTO public.institution_transfer_edges (
      from_entity_type, from_entity_id, to_institution,
      edge_basis, acceptance_scope,
      verification_status, confidence,
      max_credits_accepted, conditions,
      effective_from, effective_to,
      created_at, updated_at, created_by,
      promoted_at, promoted_by, promoted_reason
    )
    SELECT
      tp.from_entity_type,
      tp.from_entity_id,
      tp.to_institution,
      tp.edge_basis,
      tp.acceptance_scope,
      'verified'::transfer_verification_status,
      tp.confidence,
      tp.max_credits_accepted,
      tp.conditions,
      tp.effective_from,
      tp.effective_to,
      v_now, v_now, coalesce(tp.created_by, p_promoted_by),
      v_now, p_promoted_by, p_reason
    FROM to_promote tp
    RETURNING id AS verified_edge_id, from_entity_type, from_entity_id, to_institution, acceptance_scope
  ),
  updated AS (
    UPDATE public.institution_transfer_edges i
    SET
      superseded_by_edge_id = ins.verified_edge_id,
      superseded_at = v_now,
      superseded_reason = p_reason
    FROM inserted ins
    WHERE i.verification_status = 'inferred'
      AND i.superseded_by_edge_id IS NULL
      AND i.from_entity_type = ins.from_entity_type
      AND upper(trim(i.from_entity_id)) = upper(trim(ins.from_entity_id))
      AND i.to_institution = ins.to_institution
      AND i.acceptance_scope = ins.acceptance_scope
    RETURNING i.id AS inferred_edge_id, ins.verified_edge_id
  )
  SELECT
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'inferred_edge_id', inferred_edge_id,
      'verified_edge_id', verified_edge_id
    )), '[]'::jsonb)
  INTO v_promoted, v_rows
  FROM updated;

  RETURN jsonb_build_object(
    'dry_run', false,
    'promoted_count', v_promoted,
    'promotions', v_rows,
    'skips', jsonb_build_object(
      'low_confidence', v_skipped_confidence,
      'insufficient_evidence', v_skipped_evidence,
      'domain_not_allowlisted', v_skipped_allowlist,
      'conflict_with_existing_verified', v_skipped_conflict
    ),
    'thresholds', jsonb_build_object(
      'min_confidence', p_min_confidence,
      'min_evidence_count', p_min_evidence_count,
      'require_allowlisted_domain', p_require_allowlisted_domain,
      'limit', p_limit
    ),
    'promoted_at', v_now
  );
END;
$$;

-- Ensure proper access control
REVOKE ALL ON FUNCTION public.promote_eligible_edges(numeric,int,boolean,int,boolean,text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_eligible_edges(numeric,int,boolean,int,boolean,text,text) TO service_role;
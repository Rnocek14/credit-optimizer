
CREATE OR REPLACE FUNCTION public.backfill_inferred_edges_from_rules(
  p_limit int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count int := 0;
  v_evidence_inserted int := 0;
  v_skipped_existing int := 0;
  v_skipped_no_rules int := 0;
  v_errors text[] := '{}';
  v_gap RECORD;
  v_new_edge_id uuid;
  v_confidence numeric;
  v_rules_total int;
  v_rules_with_evidence int;
  v_ev RECORD;
BEGIN
  -- Find provider→institution pairs in credit_transfer_rules that have NO active edge (any status).
  FOR v_gap IN
    SELECT
      r.source_institution_norm AS provider_code,
      r.target_institution_norm AS institution_code,
      COUNT(*)::int AS rule_count,
      COUNT(*) FILTER (WHERE r.evidence_url IS NOT NULL AND r.evidence_url <> '')::int AS rules_with_evidence,
      array_agg(DISTINCT r.evidence_url) FILTER (WHERE r.evidence_url IS NOT NULL AND r.evidence_url <> '') AS evidence_urls
    FROM credit_transfer_rules r
    WHERE r.source_institution_norm IS NOT NULL
      AND r.target_institution_norm IS NOT NULL
      AND r.acceptance_status IN ('accepted', 'elective')
      AND (r.status IS NULL OR r.status = 'active')
    GROUP BY r.source_institution_norm, r.target_institution_norm
    -- FIX #3: skip if ANY active edge exists (verified OR inferred), not just inferred
    HAVING NOT EXISTS (
      SELECT 1 FROM institution_transfer_edges e
      WHERE e.from_entity_type = 'provider'
        AND upper(trim(e.from_entity_id)) = upper(trim(r.source_institution_norm))
        AND e.to_institution = upper(trim(r.target_institution_norm))
        AND e.acceptance_scope = 'general'
        AND e.superseded_by_edge_id IS NULL
    )
    ORDER BY COUNT(*) DESC
    LIMIT p_limit
  LOOP
    v_rules_total := v_gap.rule_count;
    v_rules_with_evidence := v_gap.rules_with_evidence;

    IF v_rules_total = 0 THEN
      v_skipped_no_rules := v_skipped_no_rules + 1;
      CONTINUE;
    END IF;

    v_confidence := GREATEST(0.50, LEAST(0.95,
      (v_rules_with_evidence::numeric / v_rules_total::numeric)
    ));

    BEGIN
      INSERT INTO institution_transfer_edges (
        from_entity_type, from_entity_id, to_institution,
        edge_basis, acceptance_scope, verification_status,
        confidence, created_by
      ) VALUES (
        'provider',
        upper(trim(v_gap.provider_code)),
        upper(trim(v_gap.institution_code)),
        'policy_inferred', 'general', 'inferred',
        v_confidence, 'auto:backfill-from-rules'
      )
      RETURNING id INTO v_new_edge_id;

      v_inserted_count := v_inserted_count + 1;

      -- FIX #4: don't provide evidence_domain — let the existing trigger populate it
      IF v_gap.evidence_urls IS NOT NULL THEN
        FOR v_ev IN SELECT unnest(v_gap.evidence_urls) AS url
        LOOP
          BEGIN
            INSERT INTO institution_transfer_edge_evidence (
              edge_id, evidence_url, source_type, notes
            ) VALUES (
              v_new_edge_id, v_ev.url, 'transfer_rule',
              'Auto-attached from credit_transfer_rules during backfill'
            );
            v_evidence_inserted := v_evidence_inserted + 1;
          EXCEPTION WHEN unique_violation THEN
            NULL;
          END;
        END LOOP;
      END IF;

    EXCEPTION WHEN unique_violation THEN
      v_skipped_existing := v_skipped_existing + 1;
    WHEN OTHERS THEN
      v_errors := v_errors || SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted_count', v_inserted_count,
    'evidence_inserted', v_evidence_inserted,
    'skipped_existing', v_skipped_existing,
    'skipped_no_rules', v_skipped_no_rules,
    'errors', v_errors,
    'ran_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.backfill_inferred_edges_from_rules(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_inferred_edges_from_rules(int) TO service_role;

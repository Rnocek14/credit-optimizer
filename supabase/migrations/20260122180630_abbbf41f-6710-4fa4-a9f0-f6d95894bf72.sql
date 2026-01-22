-- =========================================================
-- GAP SCAN RPCs for Transferability Audit
-- =========================================================

-- 1) Provider-rule contradictions (rules exist but missing provider edge)
CREATE OR REPLACE FUNCTION public.scan_provider_rule_edge_gaps(p_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH rules AS (
  SELECT
    UPPER(TRIM(source_institution)) AS provider_code,
    target_institution,
    COUNT(*) AS rules_count,
    COUNT(*) FILTER (WHERE evidence_url IS NOT NULL AND BTRIM(evidence_url) <> '') AS rules_with_evidence
  FROM public.credit_transfer_rules
  WHERE status = 'active'
    AND acceptance_status IN ('accepted','elective')
  GROUP BY 1,2
),
missing_edges AS (
  SELECT r.*
  FROM rules r
  LEFT JOIN public.institution_transfer_edges e
    ON e.from_entity_type = 'provider'
   AND UPPER(TRIM(e.from_entity_id)) = r.provider_code
   AND e.to_institution = r.target_institution
  WHERE e.id IS NULL
  ORDER BY r.rules_count DESC
  LIMIT p_limit
)
SELECT jsonb_build_object(
  'count', (SELECT COUNT(*) FROM missing_edges),
  'rows', COALESCE(jsonb_agg(to_jsonb(missing_edges)), '[]'::jsonb)
)
FROM missing_edges;
$$;

COMMENT ON FUNCTION public.scan_provider_rule_edge_gaps(int) IS 
'Finds institutions with active transfer rules but no corresponding provider→institution edge';

-- 2) Institutions with no inbound edges
CREATE OR REPLACE FUNCTION public.scan_institutions_missing_inbound_edges(p_limit int DEFAULT 500)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH missing AS (
  SELECT i.code AS institution
  FROM public.institutions i
  LEFT JOIN public.institution_transfer_edges e
    ON e.to_institution = i.code
  GROUP BY i.code
  HAVING COUNT(e.*) = 0
  ORDER BY i.code
  LIMIT p_limit
)
SELECT jsonb_build_object(
  'count', (SELECT COUNT(*) FROM missing),
  'rows', COALESCE(jsonb_agg(to_jsonb(missing)), '[]'::jsonb)
)
FROM missing;
$$;

COMMENT ON FUNCTION public.scan_institutions_missing_inbound_edges(int) IS 
'Finds institutions that have no inbound transfer edges (coverage gaps)';

-- 3) Institution attributes table for accreditation inference
CREATE TABLE IF NOT EXISTS public.institution_attributes (
  institution TEXT PRIMARY KEY,
  is_regionally_accredited BOOLEAN NOT NULL DEFAULT false,
  accreditation_body TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution_attributes_select_public"
  ON public.institution_attributes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "institution_attributes_modify_service"
  ON public.institution_attributes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at (reuse existing function if available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_institution_attributes_updated_at'
  ) THEN
    CREATE TRIGGER update_institution_attributes_updated_at
    BEFORE UPDATE ON public.institution_attributes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.institution_attributes IS 
'Institutional metadata for accreditation-based transfer inference';

-- 3b) Accreditation inference candidates scan
CREATE OR REPLACE FUNCTION public.scan_accreditation_inference_candidates(
  p_to_institution TEXT,
  p_limit INT DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_accepts_regional BOOLEAN := false;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  -- Check if institution has a regional acceptance policy edge
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_transfer_edges e
    WHERE e.to_institution = p_to_institution
      AND e.from_entity_type = 'accreditation'
      AND e.from_entity_id = 'regional'
      AND e.verification_status IN ('inferred','verified')
  ) INTO v_accepts_regional;

  IF NOT v_accepts_regional THEN
    RETURN jsonb_build_object('count', 0, 'rows', '[]'::jsonb, 'note', 'No regional acceptance policy edge found');
  END IF;

  WITH ra AS (
    SELECT a.institution
    FROM public.institution_attributes a
    WHERE a.is_regionally_accredited = true
    LIMIT p_limit
  ),
  missing AS (
    SELECT ra.institution AS from_institution
    FROM ra
    LEFT JOIN public.institution_transfer_edges e
      ON e.from_entity_type = 'institution'
     AND e.from_entity_id = ra.institution
     AND e.to_institution = p_to_institution
    WHERE e.id IS NULL
    LIMIT p_limit
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(missing)), '[]'::jsonb) INTO v_rows
  FROM missing;

  RETURN jsonb_build_object(
    'count', jsonb_array_length(v_rows),
    'rows', v_rows,
    'to_institution', p_to_institution
  );
END;
$$;

COMMENT ON FUNCTION public.scan_accreditation_inference_candidates(text, int) IS 
'Finds RA institutions that could have inferred edges to a target institution accepting regional accreditation';

-- 4) Conflict scan (duplicate/conflicting edges)
CREATE OR REPLACE FUNCTION public.scan_transfer_edge_conflicts(p_limit INT DEFAULT 200)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH grouped AS (
  SELECT
    from_entity_type,
    from_entity_id,
    to_institution,
    acceptance_scope,
    COUNT(*) AS n,
    array_agg(DISTINCT verification_status) AS statuses,
    array_agg(DISTINCT edge_basis) AS bases
  FROM public.institution_transfer_edges
  GROUP BY 1,2,3,4
  HAVING COUNT(*) > 1
),
scope_conflicts AS (
  SELECT
    from_entity_type,
    from_entity_id,
    to_institution,
    array_agg(DISTINCT acceptance_scope) AS scopes,
    array_agg(DISTINCT verification_status) AS statuses,
    COUNT(*) AS rows
  FROM public.institution_transfer_edges
  GROUP BY 1,2,3
  HAVING COUNT(DISTINCT acceptance_scope) > 1
)
SELECT jsonb_build_object(
  'duplicate_key_conflicts', jsonb_build_object(
    'count', (SELECT COUNT(*) FROM grouped),
    'rows', COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM (SELECT * FROM grouped LIMIT p_limit) g), '[]'::jsonb)
  ),
  'multi_scope_conflicts', jsonb_build_object(
    'count', (SELECT COUNT(*) FROM scope_conflicts),
    'rows', COALESCE((SELECT jsonb_agg(to_jsonb(sc)) FROM (SELECT * FROM scope_conflicts LIMIT p_limit) sc), '[]'::jsonb)
  )
);
$$;

COMMENT ON FUNCTION public.scan_transfer_edge_conflicts(int) IS 
'Detects duplicate or conflicting transfer edges (same pair with different scopes/statuses)';

-- =========================================================
-- Update golden_scan_report() to include top offenders
-- =========================================================
CREATE OR REPLACE FUNCTION public.golden_scan_report(p_include_institution_details BOOLEAN DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();

  -- ops
  v_policy_last_ran TIMESTAMPTZ;

  -- templates coverage
  v_templates_total INT := 0;
  v_templates_scraped INT := 0;
  v_templates_scraped_14d INT := 0;

  -- extracted coverage
  v_scraped_content_total INT := 0;
  v_extractions_with_score INT := 0;

  -- policy packs
  v_active_packs INT := 0;
  v_active_packs_waived INT := 0;

  -- transfer rules (credit_transfer_rules)
  v_rules_total INT := 0;
  v_rules_active INT := 0;
  v_rules_draft INT := 0;
  v_rules_active_missing_evidence INT := 0;
  v_rules_draft_missing_evidence INT := 0;

  -- transfer edges
  v_edges_total INT := 0;
  v_edges_verified INT := 0;
  v_edges_inferred INT := 0;

  -- blockers/warnings arrays
  v_blockers TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];

  -- offender lists
  v_templates_by_school jsonb;
  v_draft_backlog_by_school jsonb;

  -- gap scan results (NEW)
  v_provider_edge_gaps jsonb;
  v_missing_inbound jsonb;
  v_edge_conflicts jsonb;

  -- institution detail optional
  v_details jsonb := '[]'::jsonb;
  v_has_onboarding_rpc BOOLEAN := false;
BEGIN
  -- -----------------------------
  -- 0) Ops KV: policy scan last ran
  -- -----------------------------
  SELECT (value->>'last_ran_at')::TIMESTAMPTZ
    INTO v_policy_last_ran
  FROM public.ops_kv
  WHERE key = 'policy_change_scan';

  IF v_policy_last_ran IS NULL THEN
    v_blockers := array_append(v_blockers, 'Ops cron not running: ops_kv.policy_change_scan.last_ran_at is NULL');
  END IF;

  -- -----------------------------
  -- 1) Templates coverage
  -- -----------------------------
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE last_scraped_at IS NOT NULL)::INT,
    COUNT(*) FILTER (WHERE last_scraped_at >= (now() - INTERVAL '14 days'))::INT
  INTO v_templates_total, v_templates_scraped, v_templates_scraped_14d
  FROM public.scrape_url_templates
  WHERE status = 'active';

  IF v_templates_total > 0 AND v_templates_scraped = 0 THEN
    v_blockers := array_append(v_blockers, '0 templates scraped: scrape_url_templates.last_scraped_at is NULL for all active templates');
  END IF;

  -- institutions with 0 scraped templates (top list)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_templates_by_school
  FROM (
    SELECT
      institution_code,
      COUNT(*) FILTER (WHERE status='active') AS templates_active,
      COUNT(*) FILTER (WHERE status='active' AND last_scraped_at IS NOT NULL) AS templates_scraped,
      MIN(last_scraped_at) AS oldest_scrape,
      MAX(last_scraped_at) AS newest_scrape
    FROM public.scrape_url_templates
    GROUP BY institution_code
    ORDER BY (COUNT(*) FILTER (WHERE status='active' AND last_scraped_at IS NOT NULL)) ASC,
             (COUNT(*) FILTER (WHERE status='active')) DESC
    LIMIT 50
  ) t;

  -- -----------------------------
  -- 2) Scraped content & extraction coverage
  -- -----------------------------
  SELECT COUNT(*)::INT,
         COUNT(*) FILTER (WHERE total_confidence_score IS NOT NULL)::INT
  INTO v_scraped_content_total, v_extractions_with_score
  FROM public.scraped_content;

  IF v_templates_scraped > 0 AND v_extractions_with_score = 0 THEN
    v_blockers := array_append(v_blockers, 'Scrapes exist but no extracted confidence scores found in scraped_content.total_confidence_score');
  END IF;

  -- -----------------------------
  -- 3) Policy packs (activation/waivers)
  -- -----------------------------
  SELECT COUNT(*)::INT,
         COUNT(*) FILTER (
           WHERE COALESCE((policy_data->>'confidence_waived')::BOOLEAN,false) = true
              OR COALESCE((policy_data->>'provenance_waived')::BOOLEAN,false) = true
         )::INT
  INTO v_active_packs, v_active_packs_waived
  FROM public.institution_policy_packs
  WHERE status = 'active';

  IF v_active_packs_waived > 0 THEN
    v_warnings := array_append(v_warnings, 'Some active policy packs have waivers (confidence_waived or provenance_waived)');
  END IF;

  -- -----------------------------
  -- 4) credit_transfer_rules compliance
  -- -----------------------------
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE status='active')::INT,
    COUNT(*) FILTER (WHERE status='draft')::INT,
    COUNT(*) FILTER (WHERE status='active' AND (evidence_url IS NULL OR BTRIM(evidence_url)=''))::INT,
    COUNT(*) FILTER (WHERE status='draft' AND (evidence_url IS NULL OR BTRIM(evidence_url)=''))::INT
  INTO v_rules_total, v_rules_active, v_rules_draft, v_rules_active_missing_evidence, v_rules_draft_missing_evidence
  FROM public.credit_transfer_rules;

  IF v_rules_active_missing_evidence > 0 THEN
    v_blockers := array_append(v_blockers, 'Active credit_transfer_rules missing evidence_url (should have been auto-repaired to draft)');
  END IF;

  -- draft backlog by institution (top list)
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_draft_backlog_by_school
  FROM (
    SELECT
      target_institution,
      COUNT(*) FILTER (WHERE status='draft') AS draft_total,
      COUNT(*) FILTER (WHERE status='draft' AND (evidence_url IS NULL OR BTRIM(evidence_url)='')) AS draft_missing_evidence
    FROM public.credit_transfer_rules
    GROUP BY target_institution
    ORDER BY draft_total DESC
    LIMIT 50
  ) r;

  -- -----------------------------
  -- 5) Transfer edges coverage
  -- -----------------------------
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE verification_status='verified')::INT,
    COUNT(*) FILTER (WHERE verification_status='inferred')::INT
  INTO v_edges_total, v_edges_verified, v_edges_inferred
  FROM public.institution_transfer_edges;

  -- -----------------------------
  -- 6) Gap scan RPCs (Top Offenders)
  -- -----------------------------
  v_provider_edge_gaps := public.scan_provider_rule_edge_gaps(100);
  v_missing_inbound := public.scan_institutions_missing_inbound_edges(200);
  v_edge_conflicts := public.scan_transfer_edge_conflicts(100);

  -- Add warnings based on gap scans
  IF (v_provider_edge_gaps->>'count')::INT > 0 THEN
    v_warnings := array_append(v_warnings, 
      format('Provider-rule edge gaps: %s provider→institution edges missing despite active rules', 
             v_provider_edge_gaps->>'count'));
  END IF;

  IF (v_missing_inbound->>'count')::INT > 0 THEN
    v_warnings := array_append(v_warnings, 
      format('Institutions with no inbound edges: %s coverage gaps', 
             v_missing_inbound->>'count'));
  END IF;

  IF ((v_edge_conflicts->'duplicate_key_conflicts'->>'count')::INT > 0 
      OR (v_edge_conflicts->'multi_scope_conflicts'->>'count')::INT > 0) THEN
    v_warnings := array_append(v_warnings, 'Transfer edge conflicts detected (duplicates or multi-scope)');
  END IF;

  -- -----------------------------
  -- 7) Optional per-institution readiness
  -- -----------------------------
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'check_institution_onboarding_readiness'
      AND pg_function_is_visible(oid)
  )
  INTO v_has_onboarding_rpc;

  IF p_include_institution_details AND v_has_onboarding_rpc THEN
    SELECT COALESCE(jsonb_agg(x.result), '[]'::jsonb)
    INTO v_details
    FROM (
      SELECT public.check_institution_onboarding_readiness(i.code) AS result
      FROM public.institutions i
      ORDER BY i.code
      LIMIT 200
    ) x;
  END IF;

  -- -----------------------------
  -- Build final JSON
  -- -----------------------------
  RETURN jsonb_build_object(
    'checked_at', v_now,

    'ok', (array_length(v_blockers, 1) IS NULL OR array_length(v_blockers, 1) = 0),
    'blockers', CASE WHEN array_length(v_blockers,1) IS NULL THEN '[]'::jsonb ELSE to_jsonb(v_blockers) END,
    'warnings', CASE WHEN array_length(v_warnings,1) IS NULL THEN '[]'::jsonb ELSE to_jsonb(v_warnings) END,

    'ops', jsonb_build_object(
      'policy_change_scan_last_ran_at', v_policy_last_ran
    ),

    'templates', jsonb_build_object(
      'active_total', v_templates_total,
      'scraped_any', v_templates_scraped,
      'scraped_last_14d', v_templates_scraped_14d,
      'by_institution_top', v_templates_by_school
    ),

    'pipeline', jsonb_build_object(
      'scraped_content_total', v_scraped_content_total,
      'extractions_with_confidence_score', v_extractions_with_score
    ),

    'policy_packs', jsonb_build_object(
      'active_total', v_active_packs,
      'active_with_waivers', v_active_packs_waived
    ),

    'credit_transfer_rules', jsonb_build_object(
      'total', v_rules_total,
      'active', v_rules_active,
      'draft', v_rules_draft,
      'active_missing_evidence', v_rules_active_missing_evidence,
      'draft_missing_evidence', v_rules_draft_missing_evidence,
      'draft_backlog_by_institution_top', v_draft_backlog_by_school
    ),

    'transfer_edges', jsonb_build_object(
      'total', v_edges_total,
      'verified', v_edges_verified,
      'inferred', v_edges_inferred
    ),

    'top_offenders', jsonb_build_object(
      'provider_rule_edge_gaps', v_provider_edge_gaps,
      'missing_inbound_edges', v_missing_inbound,
      'edge_conflicts', v_edge_conflicts
    ),

    'institution_details_included', (p_include_institution_details AND v_has_onboarding_rpc),
    'institution_details', v_details
  );
END;
$$;

-- Ensure permissions are correct
REVOKE ALL ON FUNCTION public.golden_scan_report(boolean) FROM public;
REVOKE ALL ON FUNCTION public.golden_scan_report(boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.golden_scan_report(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.golden_scan_report(boolean) TO service_role;

-- Grant execute on gap scan RPCs to service_role
REVOKE ALL ON FUNCTION public.scan_provider_rule_edge_gaps(int) FROM public;
GRANT EXECUTE ON FUNCTION public.scan_provider_rule_edge_gaps(int) TO service_role;

REVOKE ALL ON FUNCTION public.scan_institutions_missing_inbound_edges(int) FROM public;
GRANT EXECUTE ON FUNCTION public.scan_institutions_missing_inbound_edges(int) TO service_role;

REVOKE ALL ON FUNCTION public.scan_accreditation_inference_candidates(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.scan_accreditation_inference_candidates(text, int) TO service_role;

REVOKE ALL ON FUNCTION public.scan_transfer_edge_conflicts(int) FROM public;
GRANT EXECUTE ON FUNCTION public.scan_transfer_edge_conflicts(int) TO service_role;

COMMENT ON FUNCTION public.golden_scan_report(boolean)
IS 'Audit snapshot RPC: returns blockers/warnings/coverage/top_offenders across ops loop, templates, pipeline, policy packs, transfer rules, and transfer edges.';
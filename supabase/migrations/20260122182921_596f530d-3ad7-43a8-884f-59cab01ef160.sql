-- 1) Create the corrected scan that auto-detects provider vs institution
CREATE OR REPLACE FUNCTION public.scan_rule_edge_gaps(p_limit int default 200)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH rules AS (
  SELECT
    upper(trim(source_institution)) AS source_id,
    target_institution,
    count(*)::int AS rules_count,
    count(*) FILTER (WHERE evidence_url IS NOT NULL AND btrim(evidence_url) <> '')::int AS rules_with_evidence
  FROM public.credit_transfer_rules
  WHERE acceptance_status IN ('accepted','elective')
    AND source_institution IS NOT NULL
    AND btrim(source_institution) <> ''
  GROUP BY 1,2
),
typed AS (
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.institutions i WHERE i.code = r.source_id)
        THEN 'institution'::transfer_entity_type
      ELSE 'provider'::transfer_entity_type
    END AS from_entity_type,
    r.source_id AS from_entity_id,
    r.target_institution,
    r.rules_count,
    r.rules_with_evidence
  FROM rules r
),
missing AS (
  SELECT t.*
  FROM typed t
  LEFT JOIN public.institution_transfer_edges e
    ON e.from_entity_type = t.from_entity_type
   AND upper(trim(e.from_entity_id)) = t.from_entity_id
   AND e.to_institution = t.target_institution
  WHERE e.id IS NULL
  ORDER BY t.rules_count DESC
  LIMIT p_limit
)
SELECT jsonb_build_object(
  'count', (SELECT count(*) FROM missing),
  'rows', COALESCE(jsonb_agg(to_jsonb(missing)), '[]'::jsonb)
)
FROM missing;
$$;

-- Lock to service_role only
REVOKE ALL ON FUNCTION public.scan_rule_edge_gaps(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scan_rule_edge_gaps(int) FROM anon;
REVOKE ALL ON FUNCTION public.scan_rule_edge_gaps(int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.scan_rule_edge_gaps(int) TO service_role;

-- 2) Add FK constraint to institution_attributes (skip if constraint exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'institution_attributes_institution_fk'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.institution_attributes
      ADD CONSTRAINT institution_attributes_institution_fk
      FOREIGN KEY (institution) REFERENCES public.institutions(code)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Update golden_scan_report() to use scan_rule_edge_gaps instead of scan_provider_rule_edge_gaps
CREATE OR REPLACE FUNCTION public.golden_scan_report(p_include_institution_details boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_stats jsonb;
  v_top_offenders jsonb;
  v_rule_edge_gaps jsonb;
  v_missing_inbound jsonb;
  v_edge_conflicts jsonb;
  v_ops_last_ran timestamptz;
  v_active_packs_without_evidence int;
  v_institutions_without_edges int;
BEGIN
  -- Check ops last ran
  SELECT MAX(created_at) INTO v_ops_last_ran
  FROM public.ops_audit_snapshots
  WHERE snapshot_type = 'golden_scan';

  -- Check for active policy packs without evidence
  SELECT COUNT(*) INTO v_active_packs_without_evidence
  FROM public.institution_policy_packs
  WHERE status = 'active'
    AND (evidence_url IS NULL OR btrim(evidence_url) = '');

  -- Check institutions without any inbound edges
  SELECT COUNT(*) INTO v_institutions_without_edges
  FROM public.institutions i
  LEFT JOIN public.institution_transfer_edges e ON e.to_institution = i.code
  GROUP BY i.code
  HAVING COUNT(e.*) = 0;

  -- Build blockers
  IF v_ops_last_ran IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code', 'CRON_NEVER_RAN',
      'message', 'ops-cron-runner has never executed - schedule it in Supabase Dashboard'
    );
  ELSIF v_ops_last_ran < NOW() - INTERVAL '2 hours' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code', 'CRON_STALE',
      'message', format('Last cron run was %s ago', age(NOW(), v_ops_last_ran)::text)
    );
  END IF;

  -- Build warnings
  IF v_active_packs_without_evidence > 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code', 'PACKS_WITHOUT_EVIDENCE',
      'count', v_active_packs_without_evidence,
      'message', format('%s active policy packs lack evidence URLs', v_active_packs_without_evidence)
    );
  END IF;

  IF v_institutions_without_edges > 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code', 'INSTITUTIONS_NO_INBOUND',
      'count', v_institutions_without_edges,
      'message', format('%s institutions have no inbound transfer edges', v_institutions_without_edges)
    );
  END IF;

  -- Run gap scans for top offenders
  v_rule_edge_gaps := public.scan_rule_edge_gaps(100);
  v_missing_inbound := public.scan_institutions_missing_inbound_edges(100);
  v_edge_conflicts := public.scan_transfer_edge_conflicts(100);

  v_top_offenders := jsonb_build_object(
    'rule_edge_gaps', v_rule_edge_gaps,
    'missing_inbound_edges', v_missing_inbound,
    'edge_conflicts', v_edge_conflicts
  );

  -- Build stats
  v_stats := jsonb_build_object(
    'total_institutions', (SELECT COUNT(*) FROM public.institutions),
    'total_edges', (SELECT COUNT(*) FROM public.institution_transfer_edges),
    'total_rules', (SELECT COUNT(*) FROM public.credit_transfer_rules),
    'active_policy_packs', (SELECT COUNT(*) FROM public.institution_policy_packs WHERE status = 'active'),
    'ops_last_ran', v_ops_last_ran
  );

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_blockers) = 0,
    'generated_at', NOW(),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'stats', v_stats,
    'top_offenders', v_top_offenders
  );
END;
$$;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.scan_provider_rule_edge_gaps(int);

COMMENT ON FUNCTION public.scan_rule_edge_gaps(int) IS 'Finds active rules without corresponding transfer edges, auto-detecting provider vs institution';
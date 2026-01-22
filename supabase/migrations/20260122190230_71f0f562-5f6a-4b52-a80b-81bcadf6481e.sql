-- Add dual-signal cron health check to golden_scan_report()
-- Signal A (authoritative): ops_kv.policy_change_scan.last_ran_at
-- Signal B (observability): latest ops_audit_snapshots.created_at for golden_scan
-- Blocker logic uses Signal A; missing/stale B triggers warning

CREATE OR REPLACE FUNCTION public.golden_scan_report(p_include_institution_details boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_stats jsonb;
  v_top_offenders jsonb;

  -- cron health signals (dual-signal)
  v_policy_last_ran timestamptz;
  v_snapshot_last_ran timestamptz;

  v_rule_edge_gaps jsonb;
  v_missing_inbound jsonb;
  v_edge_conflicts jsonb;

  v_active_packs_missing_prov_url int := 0;
  v_institutions_without_edges int := 0;
BEGIN
  -- =========================================================
  -- Cron health (dual-signal)
  -- =========================================================

  -- Signal A: ops_kv (authoritative: "ops loop ran")
  SELECT (value->>'last_ran_at')::timestamptz
    INTO v_policy_last_ran
  FROM public.ops_kv
  WHERE key = 'policy_change_scan';

  -- Signal B: latest stored golden scan snapshot (observability)
  SELECT max(created_at)
    INTO v_snapshot_last_ran
  FROM public.ops_audit_snapshots
  WHERE snapshot_type = 'golden_scan';

  -- Blockers based on authoritative signal
  IF v_policy_last_ran IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'CRON_NEVER_RAN',
      'message', 'ops-cron-runner has never executed (ops_kv.policy_change_scan.last_ran_at is NULL)'
    ));
  ELSIF v_policy_last_ran < now() - interval '2 hours' THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'CRON_STALE',
      'message', format('Ops cron is stale: last policy_change_scan run was %s ago', age(now(), v_policy_last_ran)::text)
    ));
  END IF;

  -- Warnings if snapshot trail is missing/stale while cron is healthy
  IF v_policy_last_ran IS NOT NULL AND v_snapshot_last_ran IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'SNAPSHOT_MISSING',
      'message', 'Cron has run (ops_kv updated) but no ops_audit_snapshots rows exist yet. Snapshot insert may be failing.'
    ));
  ELSIF v_policy_last_ran IS NOT NULL
    AND v_snapshot_last_ran IS NOT NULL
    AND v_snapshot_last_ran < v_policy_last_ran - interval '15 minutes' THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'SNAPSHOT_STALE',
      'message', format(
        'Snapshots appear stale vs ops_kv (snapshot_last=%s, ops_kv_last=%s). Insert or golden_scan_report call may be failing.',
        v_snapshot_last_ran::text, v_policy_last_ran::text
      )
    ));
  END IF;

  -- =========================================================
  -- Packs missing provenance_source_url (unwaived)
  -- =========================================================
  SELECT count(*)
    INTO v_active_packs_missing_prov_url
  FROM public.institution_policy_packs
  WHERE status='active'
    AND coalesce((policy_data->>'provenance_waived')::boolean,false)=false
    AND (policy_data->>'provenance_source_url' is null OR btrim(policy_data->>'provenance_source_url')='');

  IF v_active_packs_missing_prov_url > 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code','PACKS_MISSING_PROVENANCE_SOURCE_URL',
      'count', v_active_packs_missing_prov_url,
      'message', format('%s active policy packs missing provenance_source_url (and not waived)', v_active_packs_missing_prov_url)
    ));
  END IF;

  -- =========================================================
  -- Institutions with no inbound edges (subquery pattern)
  -- =========================================================
  SELECT count(*)
    INTO v_institutions_without_edges
  FROM (
    SELECT i.code
    FROM public.institutions i
    LEFT JOIN public.institution_transfer_edges e ON e.to_institution = i.code
    GROUP BY i.code
    HAVING count(e.*)=0
  ) s;

  IF v_institutions_without_edges > 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code','INSTITUTIONS_NO_INBOUND',
      'count', v_institutions_without_edges,
      'message', format('%s institutions have no inbound transfer edges', v_institutions_without_edges)
    ));
  END IF;

  -- =========================================================
  -- Top offenders scans (service_role only)
  -- =========================================================
  v_rule_edge_gaps := public.scan_rule_edge_gaps(100);
  v_missing_inbound := public.scan_institutions_missing_inbound_edges(100);
  v_edge_conflicts := public.scan_transfer_edge_conflicts(100);

  v_top_offenders := jsonb_build_object(
    'rule_edge_gaps', v_rule_edge_gaps,
    'missing_inbound_edges', v_missing_inbound,
    'edge_conflicts', v_edge_conflicts
  );

  -- =========================================================
  -- Stats (now includes both signals)
  -- =========================================================
  v_stats := jsonb_build_object(
    'total_institutions', (select count(*) from public.institutions),
    'total_edges', (select count(*) from public.institution_transfer_edges),
    'total_rules', (select count(*) from public.credit_transfer_rules),
    'active_policy_packs', (select count(*) from public.institution_policy_packs where status='active'),
    'ops_kv_last_ran_at', v_policy_last_ran,
    'snapshot_last_ran_at', v_snapshot_last_ran
  );

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_blockers)=0,
    'generated_at', now(),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'stats', v_stats,
    'top_offenders', v_top_offenders
  );
END;
$$;

-- Ensure service_role only execution
REVOKE EXECUTE ON FUNCTION public.golden_scan_report(boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.golden_scan_report(boolean) TO service_role;
-- Fix golden_scan_report() with corrected:
-- 1. JSONB array append using jsonb_build_array()
-- 2. SELECT INTO subquery for multiple rows
-- 3. provenance_source_url instead of evidence_url
-- 4. VOLATILE instead of STABLE

create or replace function public.golden_scan_report(p_include_institution_details boolean default false)
returns jsonb
language plpgsql
volatile
security definer
as $$
declare
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;

  v_stats jsonb;
  v_top_offenders jsonb;

  v_rule_edge_gaps jsonb;
  v_missing_inbound jsonb;
  v_edge_conflicts jsonb;

  v_ops_last_ran timestamptz;
  v_active_packs_without_evidence int := 0;
  v_institutions_without_edges int := 0;
begin
  -- cron health (using snapshots table)
  select max(created_at)
    into v_ops_last_ran
  from public.ops_audit_snapshots
  where snapshot_type = 'golden_scan';

  if v_ops_last_ran is null then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','CRON_NEVER_RAN',
      'message','ops-cron-runner has never executed - schedule it in Supabase Dashboard'
    ));
  elsif v_ops_last_ran < now() - interval '2 hours' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','CRON_STALE',
      'message', format('Last cron run was %s ago', age(now(), v_ops_last_ran)::text)
    ));
  end if;

  -- packs missing provenance_source_url (unless waived)
  select count(*)
    into v_active_packs_without_evidence
  from public.institution_policy_packs
  where status='active'
    and coalesce((policy_data->>'provenance_waived')::boolean,false)=false
    and (policy_data->>'provenance_source_url' is null or btrim(policy_data->>'provenance_source_url')='');

  if v_active_packs_without_evidence > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code','PACKS_MISSING_PROVENANCE_SOURCE_URL',
      'count', v_active_packs_without_evidence,
      'message', format('%s active policy packs missing provenance_source_url (and not waived)', v_active_packs_without_evidence)
    ));
  end if;

  -- institutions with no inbound edges (fixed: subquery to avoid multiple rows)
  select count(*)
    into v_institutions_without_edges
  from (
    select i.code
    from public.institutions i
    left join public.institution_transfer_edges e on e.to_institution = i.code
    group by i.code
    having count(e.*)=0
  ) s;

  if v_institutions_without_edges > 0 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code','INSTITUTIONS_NO_INBOUND',
      'count', v_institutions_without_edges,
      'message', format('%s institutions have no inbound transfer edges', v_institutions_without_edges)
    ));
  end if;

  -- top offenders scans (service role only)
  v_rule_edge_gaps := public.scan_rule_edge_gaps(100);
  v_missing_inbound := public.scan_institutions_missing_inbound_edges(100);
  v_edge_conflicts := public.scan_transfer_edge_conflicts(100);

  v_top_offenders := jsonb_build_object(
    'rule_edge_gaps', v_rule_edge_gaps,
    'missing_inbound_edges', v_missing_inbound,
    'edge_conflicts', v_edge_conflicts
  );

  v_stats := jsonb_build_object(
    'total_institutions', (select count(*) from public.institutions),
    'total_edges', (select count(*) from public.institution_transfer_edges),
    'total_rules', (select count(*) from public.credit_transfer_rules),
    'active_policy_packs', (select count(*) from public.institution_policy_packs where status='active'),
    'ops_last_ran', v_ops_last_ran
  );

  return jsonb_build_object(
    'ok', jsonb_array_length(v_blockers)=0,
    'generated_at', now(),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'stats', v_stats,
    'top_offenders', v_top_offenders
  );
end;
$$;

-- Ensure service_role only execution
revoke execute on function public.golden_scan_report(boolean) from public, anon, authenticated;
grant execute on function public.golden_scan_report(boolean) to service_role;
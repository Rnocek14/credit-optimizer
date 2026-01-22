-- =========================================================
-- GOLDEN SCAN REPORT (Audit Snapshot) RPC
-- Returns a single JSON blob with blockers/warnings/coverage.
-- =========================================================

create or replace function public.golden_scan_report(p_include_institution_details boolean default true)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();

  -- ops
  v_policy_last_ran timestamptz;

  -- templates coverage
  v_templates_total int := 0;
  v_templates_scraped int := 0;
  v_templates_scraped_14d int := 0;

  -- extracted coverage
  v_scraped_content_total int := 0;
  v_extractions_with_score int := 0;

  -- policy packs
  v_active_packs int := 0;
  v_active_packs_waived int := 0;

  -- transfer rules (credit_transfer_rules)
  v_rules_total int := 0;
  v_rules_active int := 0;
  v_rules_draft int := 0;
  v_rules_active_missing_evidence int := 0;
  v_rules_draft_missing_evidence int := 0;

  -- transfer edges
  v_edges_total int := 0;
  v_edges_verified int := 0;
  v_edges_inferred int := 0;

  -- blockers/warnings arrays
  v_blockers text[] := array[]::text[];
  v_warnings text[] := array[]::text[];

  -- offender lists
  v_templates_by_school jsonb;
  v_draft_backlog_by_school jsonb;
  v_inbound_edges_missing jsonb;

  -- institution detail optional
  v_details jsonb := '[]'::jsonb;

  v_has_onboarding_rpc boolean := false;
begin
  -- -----------------------------
  -- 0) Ops KV: policy scan last ran
  -- -----------------------------
  select (value->>'last_ran_at')::timestamptz
    into v_policy_last_ran
  from public.ops_kv
  where key = 'policy_change_scan';

  if v_policy_last_ran is null then
    v_blockers := array_append(v_blockers, 'Ops cron not running: ops_kv.policy_change_scan.last_ran_at is NULL');
  end if;

  -- -----------------------------
  -- 1) Templates coverage
  -- -----------------------------
  select
    count(*)::int,
    count(*) filter (where last_scraped_at is not null)::int,
    count(*) filter (where last_scraped_at >= (now() - interval '14 days'))::int
  into v_templates_total, v_templates_scraped, v_templates_scraped_14d
  from public.scrape_url_templates
  where status = 'active';

  if v_templates_total > 0 and v_templates_scraped = 0 then
    v_blockers := array_append(v_blockers, '0 templates scraped: scrape_url_templates.last_scraped_at is NULL for all active templates');
  end if;

  -- institutions with 0 scraped templates (top list)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_templates_by_school
  from (
    select
      institution_code,
      count(*) filter (where status='active') as templates_active,
      count(*) filter (where status='active' and last_scraped_at is not null) as templates_scraped,
      min(last_scraped_at) as oldest_scrape,
      max(last_scraped_at) as newest_scrape
    from public.scrape_url_templates
    group by institution_code
    order by (count(*) filter (where status='active' and last_scraped_at is not null)) asc,
             (count(*) filter (where status='active')) desc
    limit 50
  ) t;

  -- -----------------------------
  -- 2) Scraped content & extraction coverage
  -- -----------------------------
  select count(*)::int,
         count(*) filter (where total_confidence_score is not null)::int
  into v_scraped_content_total, v_extractions_with_score
  from public.scraped_content;

  -- If you want a warning for "scraped but no extraction", only meaningful after scrapes exist
  if v_templates_scraped > 0 and v_extractions_with_score = 0 then
    v_blockers := array_append(v_blockers, 'Scrapes exist but no extracted confidence scores found in scraped_content.total_confidence_score');
  end if;

  -- -----------------------------
  -- 3) Policy packs (activation/waivers)
  -- -----------------------------
  select count(*)::int,
         count(*) filter (
           where coalesce((policy_data->>'confidence_waived')::boolean,false) = true
              or coalesce((policy_data->>'provenance_waived')::boolean,false) = true
         )::int
  into v_active_packs, v_active_packs_waived
  from public.institution_policy_packs
  where status = 'active';

  if v_active_packs_waived > 0 then
    v_warnings := array_append(v_warnings, 'Some active policy packs have waivers (confidence_waived or provenance_waived)');
  end if;

  -- -----------------------------
  -- 4) credit_transfer_rules compliance
  -- -----------------------------
  select
    count(*)::int,
    count(*) filter (where status='active')::int,
    count(*) filter (where status='draft')::int,
    count(*) filter (where status='active' and (evidence_url is null or btrim(evidence_url)=''))::int,
    count(*) filter (where status='draft' and (evidence_url is null or btrim(evidence_url)=''))::int
  into v_rules_total, v_rules_active, v_rules_draft, v_rules_active_missing_evidence, v_rules_draft_missing_evidence
  from public.credit_transfer_rules;

  if v_rules_active_missing_evidence > 0 then
    v_blockers := array_append(v_blockers, 'Active credit_transfer_rules missing evidence_url (should have been auto-repaired to draft)');
  end if;

  -- draft backlog by institution (top list)
  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  into v_draft_backlog_by_school
  from (
    select
      target_institution,
      count(*) filter (where status='draft') as draft_total,
      count(*) filter (where status='draft' and (evidence_url is null or btrim(evidence_url)='')) as draft_missing_evidence
    from public.credit_transfer_rules
    group by target_institution
    order by draft_total desc
    limit 50
  ) r;

  -- -----------------------------
  -- 5) Transfer edges coverage
  -- -----------------------------
  select
    count(*)::int,
    count(*) filter (where verification_status='verified')::int,
    count(*) filter (where verification_status='inferred')::int
  into v_edges_total, v_edges_verified, v_edges_inferred
  from public.institution_transfer_edges;

  -- institutions with NO inbound edges (top list)
  -- inbound edge = any row where to_institution = institution code
  select coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb)
  into v_inbound_edges_missing
  from (
    select i.code as institution
    from public.institutions i
    left join public.institution_transfer_edges e
      on e.to_institution = i.code
    group by i.code
    having count(e.*) = 0
    order by i.code
    limit 200
  ) m;

  if jsonb_array_length(v_inbound_edges_missing) > 0 then
    v_warnings := array_append(v_warnings, 'Some institutions have no inbound transfer edges (coverage gap)');
  end if;

  -- -----------------------------
  -- 6) Optional per-institution readiness
  -- -----------------------------
  select exists (
    select 1
    from pg_proc
    where proname = 'check_institution_onboarding_readiness'
      and pg_function_is_visible(oid)
  )
  into v_has_onboarding_rpc;

  if p_include_institution_details and v_has_onboarding_rpc then
    select coalesce(jsonb_agg(x.result), '[]'::jsonb)
    into v_details
    from (
      select public.check_institution_onboarding_readiness(i.code) as result
      from public.institutions i
      order by i.code
      limit 200
    ) x;
  end if;

  -- -----------------------------
  -- Build final JSON
  -- -----------------------------
  return jsonb_build_object(
    'checked_at', v_now,

    'ok', (array_length(v_blockers, 1) is null or array_length(v_blockers, 1) = 0),
    'blockers', case when array_length(v_blockers,1) is null then '[]'::jsonb else to_jsonb(v_blockers) end,
    'warnings', case when array_length(v_warnings,1) is null then '[]'::jsonb else to_jsonb(v_warnings) end,

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
      'inferred', v_edges_inferred,
      'institutions_missing_inbound_edges_top', v_inbound_edges_missing
    ),

    'institution_details_included', (p_include_institution_details and v_has_onboarding_rpc),
    'institution_details', v_details
  );
end;
$$;

comment on function public.golden_scan_report(boolean)
is 'Audit snapshot RPC: returns blockers/warnings/coverage across ops loop, templates, pipeline, policy packs, transfer rules, and transfer edges.';

-- lock down execution to server-side callers (service role / edge functions).
revoke all on function public.golden_scan_report(boolean) from public;
grant execute on function public.golden_scan_report(boolean) to service_role;
grant execute on function public.golden_scan_report(boolean) to authenticated;
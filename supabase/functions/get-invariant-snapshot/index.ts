/**
 * Admin Invariant Snapshot Drilldown Endpoint
 * 
 * Returns template metadata + latest invariant snapshot + job info for admin UI.
 * Enables "Why was this template blocked/warned?" explanations.
 * 
 * @version 2026-01-invariant-drilldown-v1
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SnapshotDrilldownResponse {
  template: {
    id: string;
    institution_code: string;
    program_slug: string;
    track: string;
    generated_at: string | null;
    status?: string;
  } | null;
  snapshot: {
    id: string;
    job_id: string | null;
    template_status: string;
    invariant_version: string;
    effective_config: Record<string, unknown>;
    decision: string;
    violation_codes: string[];
    created_at: string;
  } | null;
  job: {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1) AUTHENTICATE USER (anon key + auth header)
    // ========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // User-context client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.warn('[get-invariant-snapshot] Auth failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // 2) VERIFY ADMIN ROLE
    // ========================================================================
    const { data: roleRow, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('[get-invariant-snapshot] Role check error:', roleError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleRow) {
      console.warn(`[get-invariant-snapshot] User ${user.id} is not admin`);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // 3) PARSE QUERY PARAMS
    // ========================================================================
    const url = new URL(req.url);
    const templateId = url.searchParams.get('template_id');
    const invariantVersion = url.searchParams.get('invariant_version'); // Optional

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: template_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // 4) FETCH DATA (service role for full access)
    // ========================================================================
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 4a) Template metadata
    const { data: template, error: templateError } = await adminClient
      .from('program_templates')
      .select('id, institution_code, program_slug, track, generated_at, source_snapshot')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError) {
      console.error('[get-invariant-snapshot] Template fetch error:', templateError.message);
    }

    // 4b) Snapshot (latest or specific version)
    let snapshotQuery = adminClient
      .from('invariant_decision_snapshots')
      .select('id, job_id, template_status, invariant_version, effective_config, decision, violation_codes, created_at')
      .eq('template_id', templateId);

    if (invariantVersion) {
      snapshotQuery = snapshotQuery.eq('invariant_version', invariantVersion);
    }

    const { data: snapshots, error: snapshotError } = await snapshotQuery
      .order('created_at', { ascending: false })
      .limit(1);

    if (snapshotError) {
      console.error('[get-invariant-snapshot] Snapshot fetch error:', snapshotError.message);
    }

    const snapshot = snapshots?.[0] ?? null;

    // 4c) Job info (if snapshot has job_id)
    let job = null;
    if (snapshot?.job_id) {
      const { data: jobData, error: jobError } = await adminClient
        .from('template_generation_jobs')
        .select('id, status, created_at, completed_at')
        .eq('id', snapshot.job_id)
        .maybeSingle();

      if (jobError) {
        console.error('[get-invariant-snapshot] Job fetch error:', jobError.message);
      } else {
        job = jobData;
      }
    }

    // ========================================================================
    // 5) BUILD RESPONSE
    // ========================================================================
    const response: SnapshotDrilldownResponse = {
      template: template ? {
        id: template.id,
        institution_code: template.institution_code,
        program_slug: template.program_slug,
        track: template.track,
        generated_at: template.generated_at,
        status: (template.source_snapshot as any)?.policy_gate?.status ?? undefined,
      } : null,
      snapshot: snapshot ? {
        id: snapshot.id,
        job_id: snapshot.job_id,
        template_status: snapshot.template_status,
        invariant_version: snapshot.invariant_version,
        effective_config: snapshot.effective_config as Record<string, unknown>,
        decision: snapshot.decision,
        violation_codes: snapshot.violation_codes,
        created_at: snapshot.created_at,
      } : null,
      job,
    };

    console.log(`[get-invariant-snapshot] Fetched drilldown for template=${templateId}, snapshot=${snapshot?.id ?? 'none'}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-invariant-snapshot] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * SMOKE TEST SQL QUERIES (run in SQL editor to verify data):
 * 
 * -- 1) Recent snapshots with template info
 * SELECT 
 *   s.template_id, s.decision, s.invariant_version, s.violation_codes,
 *   t.institution_code, t.program_slug, t.track
 * FROM invariant_decision_snapshots s
 * LEFT JOIN program_templates t ON t.id = s.template_id
 * ORDER BY s.created_at DESC
 * LIMIT 10;
 * 
 * -- 2) Snapshots with job linkage
 * SELECT 
 *   s.template_id, s.decision, s.job_id,
 *   j.status as job_status, j.created_at as job_created
 * FROM invariant_decision_snapshots s
 * LEFT JOIN template_generation_jobs j ON j.id = s.job_id
 * WHERE s.job_id IS NOT NULL
 * ORDER BY s.created_at DESC
 * LIMIT 10;
 * 
 * -- 3) Decision distribution
 * SELECT decision, count(*) as n
 * FROM invariant_decision_snapshots
 * GROUP BY decision;
 */

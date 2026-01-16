/**
 * List Invariant Snapshots - Bulk Admin Endpoint
 * 
 * Returns latest snapshot per template for admin dashboard views.
 * Uses SQL RPC with window function for correct "latest per template" semantics.
 * 
 * @version 2026-01-invariant-list-v2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store',
};

interface SnapshotSummary {
  template_id: string;
  decision: string;
  violation_codes: string[];
  violation_count: number;
  invariant_version: string;
  created_at: string;
  job_id: string | null;
  institution_code: string;
  track: string | null;
}

interface ListResponse {
  snapshots: SnapshotSummary[];
  total: number;
  limit: number;
  offset: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1) AUTHENTICATE USER
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.warn('[list-invariant-snapshots] Auth failed:', userError?.message);
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
      console.error('[list-invariant-snapshots] Role check error:', roleError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleRow) {
      console.warn(`[list-invariant-snapshots] User ${user.id} is not admin`);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // 3) PARSE QUERY PARAMS
    // ========================================================================
    const url = new URL(req.url);
    const institutionCode = url.searchParams.get('institution_code') || null;
    const track = url.searchParams.get('track') || null;
    const decision = url.searchParams.get('decision') || null;
    const templateIdsParam = url.searchParams.get('template_ids');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Parse template_ids into UUID array (limit to 100 to prevent URL issues)
    const templateIds: string[] | null = templateIdsParam 
      ? templateIdsParam.split(',').map(id => id.trim()).filter(Boolean).slice(0, 100)
      : null;

    // ========================================================================
    // 4) FETCH DATA VIA RPC (service role for RPC access)
    // ========================================================================
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Call the RPC function for latest snapshot per template
    const { data: snapshots, error: rpcError } = await serviceClient.rpc(
      'admin_list_latest_invariant_snapshots',
      {
        p_institution_code: institutionCode,
        p_track: track,
        p_decision: decision,
        p_template_ids: templateIds,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (rpcError) {
      console.error('[list-invariant-snapshots] RPC error:', rpcError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch snapshots' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get accurate total count
    const { data: totalCount, error: countError } = await serviceClient.rpc(
      'admin_count_latest_invariant_snapshots',
      {
        p_institution_code: institutionCode,
        p_track: track,
        p_decision: decision,
        p_template_ids: templateIds,
      }
    );

    if (countError) {
      console.error('[list-invariant-snapshots] Count RPC error:', countError.message);
      // Non-fatal: continue with 0 total
    }

    const response: ListResponse = {
      snapshots: (snapshots || []).map((row: any) => ({
        template_id: row.template_id,
        decision: row.decision,
        violation_codes: row.violation_codes || [],
        violation_count: row.violation_count ?? 0,
        invariant_version: row.invariant_version,
        created_at: row.created_at,
        job_id: row.job_id,
        institution_code: row.institution_code,
        track: row.track,
      })),
      total: Number(totalCount) || 0,
      limit,
      offset,
    };

    console.log(`[list-invariant-snapshots] Returned ${response.snapshots.length} snapshots (total: ${response.total})`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[list-invariant-snapshots] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

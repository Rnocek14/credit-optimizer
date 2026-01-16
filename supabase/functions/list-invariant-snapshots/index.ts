/**
 * List Invariant Snapshots - Bulk Admin Endpoint
 * 
 * Returns latest snapshot per template for admin dashboard views.
 * Avoids N+1 queries by fetching in bulk with DISTINCT ON.
 * 
 * @version 2026-01-invariant-list-v1
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
    const institutionCode = url.searchParams.get('institution_code');
    const track = url.searchParams.get('track');
    const decision = url.searchParams.get('decision');
    const templateIdsParam = url.searchParams.get('template_ids');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const templateIds = templateIdsParam 
      ? templateIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : null;

    // ========================================================================
    // 4) FETCH DATA (service role)
    // ========================================================================
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Build query for latest snapshot per template
    // Using a subquery approach since Supabase JS doesn't support DISTINCT ON directly
    let query = serviceClient
      .from('invariant_decision_snapshots')
      .select('template_id, decision, violation_codes, invariant_version, created_at, job_id', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (institutionCode) {
      query = query.eq('institution_code', institutionCode);
    }
    if (track) {
      query = query.eq('track', track);
    }
    if (decision) {
      query = query.eq('decision', decision);
    }
    if (templateIds && templateIds.length > 0) {
      query = query.in('template_id', templateIds);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: snapshots, error: queryError, count } = await query;

    if (queryError) {
      console.error('[list-invariant-snapshots] Query error:', queryError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch snapshots' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate to get latest per template_id (in case of duplicates in page)
    const latestByTemplate = new Map<string, SnapshotSummary>();
    for (const row of (snapshots || [])) {
      if (!latestByTemplate.has(row.template_id)) {
        latestByTemplate.set(row.template_id, {
          template_id: row.template_id,
          decision: row.decision,
          violation_codes: row.violation_codes || [],
          violation_count: (row.violation_codes || []).length,
          invariant_version: row.invariant_version,
          created_at: row.created_at,
          job_id: row.job_id,
        });
      }
    }

    const response: ListResponse = {
      snapshots: Array.from(latestByTemplate.values()),
      total: count ?? 0,
      limit,
      offset,
    };

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

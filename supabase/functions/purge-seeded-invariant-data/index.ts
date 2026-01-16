/**
 * Admin-only Edge Function: Purge Seeded Invariant Data
 * 
 * Deletes synthetic/seeded invariant_decision_snapshots and template_generation_jobs
 * that were created for QA purposes (data_source = 'seed').
 * 
 * Supports dry_run mode to preview what would be deleted.
 * 
 * @endpoint POST /purge-seeded-invariant-data
 * @body { dry_run?: boolean } - defaults to true for safety
 * @returns { snapshots_deleted: number, jobs_deleted: number, dry_run: boolean }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store',
};

interface PurgeRequest {
  dry_run?: boolean;
}

interface PurgeResponse {
  snapshots_deleted: number;
  jobs_deleted: number;
  dry_run: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: PurgeRequest = { dry_run: true }; // Default to dry_run for safety
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Use defaults if body is empty or invalid
    }

    const dryRun = body.dry_run !== false; // Only false if explicitly set to false

    console.log(`[purge-seeded-invariant-data] Admin ${user.email} requesting purge (dry_run=${dryRun})`);

    // Call the RPC function with service role for actual deletion
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabaseService.rpc('admin_purge_seeded_invariant_data', {
      p_dry_run: dryRun,
    });

    if (error) {
      console.error(`[purge-seeded-invariant-data] RPC error: ${error.message}`);
      return new Response(
        JSON.stringify({ error: `Purge failed: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0] || { snapshots_deleted: 0, jobs_deleted: 0 };

    const response: PurgeResponse = {
      snapshots_deleted: Number(result.snapshots_deleted),
      jobs_deleted: Number(result.jobs_deleted),
      dry_run: dryRun,
    };

    console.log(`[purge-seeded-invariant-data] Result: ${JSON.stringify(response)}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error(`[purge-seeded-invariant-data] Unexpected error: ${err}`);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

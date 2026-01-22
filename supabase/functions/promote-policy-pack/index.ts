import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluatePolicyGate, checkV1InstitutionScopeAsync, PolicyData } from "../_shared/policyGate.ts";

// Critical env vars - fail fast with explicit names if missing
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const missingEnvVars: string[] = [];
if (!SUPABASE_URL) missingEnvVars.push('SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingEnvVars.push('SUPABASE_ANON_KEY');
if (!SUPABASE_SERVICE_ROLE_KEY) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromoteRequest {
  packId: string;
  forcePromotion?: boolean; // Allow yellow gate promotion with acknowledgment
}

/**
 * Derive hasGroundTruth from pack fields - handles both string and object provenance values
 * Mirrors view logic exactly but handles edge cases safely
 */
function deriveHasGroundTruth(pack: {
  provenance_url?: string | null;
  last_verified_at?: string | null;
  policy_data?: Record<string, unknown> | null;
  field_provenance?: Record<string, unknown> | null;
}): boolean {
  // Check provenance_url
  if (pack.provenance_url) return true;
  
  // Check last_verified_at
  if (pack.last_verified_at) return true;
  
  // Check policy_data.provenance_verified_at
  if (pack.policy_data?.provenance_verified_at) return true;
  
  // Check field_provenance for ground_truth/human_override sources
  // Handle both string values AND object values with "source" key
  if (pack.field_provenance && typeof pack.field_provenance === 'object') {
    const groundTruthSources = ['ground_truth', 'human_override', 'catalog_pdf'];
    
    for (const value of Object.values(pack.field_provenance)) {
      // Case 1: value is a string (e.g., { "max_alt_credit": "ground_truth" })
      if (typeof value === 'string' && groundTruthSources.includes(value)) {
        return true;
      }
      // Case 2: value is an object with "source" key (e.g., { "max_alt_credit": { "source": "catalog_pdf", "url": "..." } })
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sourceValue = (value as Record<string, unknown>).source;
        if (typeof sourceValue === 'string' && groundTruthSources.includes(sourceValue)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Admin authorization check
 * Checks stakeholders table for admin/mentor/curator role
 */
async function isAuthorizedAdmin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Check stakeholders table for admin role
  const { data: stakeholder } = await supabase
    .from('stakeholders')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'mentor', 'curator'])
    .maybeSingle();
  
  if (stakeholder) return true;
  
  // Check profiles for admin-like capabilities
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  // Check if profile has admin flag
  if (profile && (profile as Record<string, unknown>).is_admin === true) return true;
  
  // Fallback allowlist for development
  const allowlistEnv = Deno.env.get('PROMOTION_ADMIN_EMAILS') || '';
  if (allowlistEnv) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (user?.email) {
      const allowlist = allowlistEnv.split(',').map((e: string) => e.trim().toLowerCase());
      if (allowlist.includes(user.email.toLowerCase())) return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =========================================================================
    // AUTHENTICATION: Verify JWT and get user
    // =========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use pre-validated env vars
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the token and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('[promote-policy-pack] Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    console.log(`[promote-policy-pack] Authenticated user: ${userId}`);

    // =========================================================================
    // AUTHORIZATION: Check if user is allowed to promote packs
    // =========================================================================
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const isAdmin = await isAuthorizedAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, userId);
    if (!isAdmin) {
      console.warn(`[promote-policy-pack] User ${userId} is not authorized to promote packs`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[promote-policy-pack] User ${userId} authorized as admin`);

    // =========================================================================
    // PROCESS REQUEST
    // =========================================================================
    const { packId, forcePromotion = false }: PromoteRequest = await req.json();

    if (!packId) {
      return new Response(
        JSON.stringify({ error: 'packId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[promote-policy-pack] Promoting pack ${packId}, force=${forcePromotion}`);

    // Fetch the pack
    const { data: pack, error: fetchError } = await serviceClient
      .from('institution_policy_packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (fetchError || !pack) {
      return new Response(
        JSON.stringify({ error: 'Pack not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // V1 SCOPE ENFORCEMENT: Verify pack's institution is in V1 scope (DB-backed)
    // =========================================================================
    const scopeCheck = await checkV1InstitutionScopeAsync(pack.institution, serviceClient);
    if (!scopeCheck.allowed) {
      console.warn(`[promote-policy-pack] V1 scope block: ${scopeCheck.reason}`);
      return new Response(
        JSON.stringify({ error: 'INSTITUTION_NOT_IN_V1_SCOPE', message: scopeCheck.reason }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Already active?
    if (pack.status === 'active') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Pack is already active',
          pack: { id: packId, status: pack.status }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // GATE EVALUATION: Use shared evaluatePolicyGate (no drift!)
    // =========================================================================
    const policyData = (pack.policy_data || {}) as PolicyData;
    const hasGroundTruth = deriveHasGroundTruth(pack);
    
    // Use the SHARED gate logic - same as seeder/worker
    const gate = evaluatePolicyGate(policyData, hasGroundTruth);
    console.log(`[promote-policy-pack] Gate result:`, gate);

    // Check for blocked_reason (additional block not in gate)
    if (pack.blocked_reason) {
      await serviceClient.from('policy_pack_events').insert({
        pack_id: packId,
        event_type: 'pack_promotion_blocked',
        payload: { 
          gate, 
          blocked_reason: pack.blocked_reason,
          attempted_by: userId 
        },
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Pack is blocked: ${pack.blocked_reason}`,
          gate,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block red gate
    if (gate.status === 'red') {
      await serviceClient.from('policy_pack_events').insert({
        pack_id: packId,
        event_type: 'pack_promotion_blocked',
        payload: { gate, reason: gate.reason, attempted_by: userId },
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot promote: gate is red',
          gate,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Yellow gate requires forcePromotion acknowledgment
    if (gate.status === 'yellow' && !forcePromotion) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Yellow gate requires forcePromotion=true acknowledgment',
          gate,
          requiresForce: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // PROMOTE THE PACK (atomic update with race protection)
    // =========================================================================
    const { data: updatedPack, error: updateError } = await serviceClient
      .from('institution_policy_packs')
      .update({
        status: 'active',
        promoted_at: new Date().toISOString(),
        promoted_by: userId,
      })
      .eq('id', packId)
      .neq('status', 'active')  // Race protection: only update if not already active
      .select()
      .maybeSingle();

    if (updateError) {
      console.error(`[promote-policy-pack] Update error:`, updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update pack', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Race condition: update returned no rows - check if already active (idempotent success)
    if (!updatedPack) {
      const { data: recheckPack } = await serviceClient
        .from('institution_policy_packs')
        .select('status')
        .eq('id', packId)
        .single();
      
      if (recheckPack?.status === 'active') {
        // Already active - return idempotent success
        console.log(`[promote-policy-pack] Pack ${packId} already active (idempotent)`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pack is already active',
            pack: { id: packId, status: 'active' },
            idempotent: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Something else blocked the update - true conflict
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Pack promotion was blocked or modified by another process',
          pack: { id: packId }
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the promotion event
    await serviceClient.from('policy_pack_events').insert({
      pack_id: packId,
      event_type: 'pack_promoted',
      payload: { 
        gate, 
        forced: gate.status === 'yellow',
        promoted_by: userId,
        institution: pack.institution,
      },
    });

    // =========================================================================
    // ENQUEUE TEMPLATE GENERATION JOB (idempotent - unique constraint handles dupes)
    // =========================================================================
    const { error: enqueueError } = await serviceClient
      .from('template_generation_jobs')
      .insert({
        institution: pack.institution,
        program_code: null, // All programs for this institution
        pack_id: packId,
        status: 'queued',
        priority: gate.status === 'green' ? 80 : 60, // Green gets higher priority
        run_after: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    // Ignore unique constraint violation - job already exists
    const jobEnqueued = !enqueueError || enqueueError.code === '23505';
    if (enqueueError && enqueueError.code !== '23505') {
      console.warn(`[promote-policy-pack] Job enqueue warning:`, enqueueError);
    } else {
      console.log(`[promote-policy-pack] Template generation job ${jobEnqueued ? 'enqueued' : 'already exists'} for ${pack.institution}`);
    }

    console.log(`[promote-policy-pack] ✅ Pack ${packId} promoted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pack: { 
          id: packId, 
          institution: pack.institution,
          status: 'active',
          promotedAt: new Date().toISOString(),
        },
        gate,
        jobEnqueued,
        message: gate.status === 'yellow' 
          ? 'Pack promoted with yellow gate (templates will be pending_review)'
          : 'Pack promoted successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[promote-policy-pack] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluatePolicyGate, PolicyData } from "../_shared/policyGate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromoteRequest {
  packId: string;
  forcePromotion?: boolean; // Allow yellow gate promotion with acknowledgment
}

/**
 * Derive hasGroundTruth from pack fields - mirrors view logic exactly
 */
function deriveHasGroundTruth(pack: {
  provenance_url?: string | null;
  last_verified_at?: string | null;
  policy_data?: Record<string, unknown> | null;
  field_provenance?: Record<string, string> | null;
}): boolean {
  // Check provenance_url
  if (pack.provenance_url) return true;
  
  // Check last_verified_at
  if (pack.last_verified_at) return true;
  
  // Check policy_data.provenance_verified_at
  if (pack.policy_data?.provenance_verified_at) return true;
  
  // Check field_provenance for ground_truth/human_override sources
  if (pack.field_provenance && typeof pack.field_provenance === 'object') {
    const groundTruthSources = ['ground_truth', 'human_override', 'catalog_pdf'];
    for (const source of Object.values(pack.field_provenance)) {
      if (groundTruthSources.includes(source)) return true;
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

    // Create client with anon key first to verify the token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const isAdmin = await isAuthorizedAdmin(supabaseUrl, supabaseServiceKey, userId);
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
    // PROMOTE THE PACK
    // =========================================================================
    const { error: updateError } = await serviceClient
      .from('institution_policy_packs')
      .update({
        status: 'active',
        promoted_at: new Date().toISOString(),
        promoted_by: userId,
      })
      .eq('id', packId);

    if (updateError) {
      console.error(`[promote-policy-pack] Update error:`, updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update pack', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromoteRequest {
  packId: string;
  forcePromotion?: boolean; // Allow yellow gate promotion with acknowledgment
}

interface GateResult {
  status: 'green' | 'yellow' | 'red';
  score: number;
  hasGroundTruth: boolean;
  reason: string;
}

/**
 * Server-side gate evaluation - never trust client
 */
function evaluateGate(pack: {
  completeness_score: number | null;
  confidence_score: number | null;
  has_ground_truth: boolean | null;
  blocked_reason: string | null;
  status: string;
}): GateResult {
  const score = pack.completeness_score ?? pack.confidence_score ?? 0;
  const hasGroundTruth = pack.has_ground_truth ?? false;
  
  if (pack.blocked_reason) {
    return {
      status: 'red',
      score,
      hasGroundTruth,
      reason: `Blocked: ${pack.blocked_reason}`,
    };
  }
  
  if (score >= 80 && hasGroundTruth) {
    return {
      status: 'green',
      score,
      hasGroundTruth,
      reason: 'Ready for auto-promotion',
    };
  }
  
  if (score >= 60) {
    return {
      status: 'yellow',
      score,
      hasGroundTruth,
      reason: hasGroundTruth 
        ? 'Can promote (score below 80)' 
        : 'Can promote manually (missing ground truth)',
    };
  }
  
  return {
    status: 'red',
    score,
    hasGroundTruth,
    reason: `Score too low (${score} < 60)`,
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user for audit trail
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id ?? null;
    }

    const { packId, forcePromotion = false }: PromoteRequest = await req.json();

    if (!packId) {
      return new Response(
        JSON.stringify({ error: 'packId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[promote-policy-pack] Promoting pack ${packId}, force=${forcePromotion}`);

    // Fetch the pack
    const { data: pack, error: fetchError } = await supabase
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

    // Evaluate gate server-side
    const gate = evaluateGate(pack);
    console.log(`[promote-policy-pack] Gate result:`, gate);

    // Block red gate
    if (gate.status === 'red') {
      // Log the blocked attempt
      await supabase.from('policy_pack_events').insert({
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

    // Promote the pack
    const { error: updateError } = await supabase
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
    await supabase.from('policy_pack_events').insert({
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

    // Trigger template generation for this institution
    // (We'll invoke the seeder if it's BSBA, or queue for worker otherwise)
    const institution = pack.institution;
    let generationResult = null;
    
    // For now, just return success - generation can be triggered separately
    // In a full implementation, we'd call seed-bsba-templates here

    return new Response(
      JSON.stringify({ 
        success: true, 
        pack: { 
          id: packId, 
          institution,
          status: 'active',
          promotedAt: new Date().toISOString(),
        },
        gate,
        generationResult,
        message: gate.status === 'yellow' 
          ? 'Pack promoted with yellow gate (templates will be pending_review)'
          : 'Pack promoted successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[promote-policy-pack] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

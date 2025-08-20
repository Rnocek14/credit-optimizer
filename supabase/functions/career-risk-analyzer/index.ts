import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Known dev users for safe authentication bypass
const KNOWN_DEV_USERS = [
  '2b458624-d498-4cca-a63d-9341cc20e363', // Aisha Khan
  '3c459625-e499-5ddb-b64d-a442dd21f474', // Mateo Silva
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'  // Jade Chen
];

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const devUserId = req.headers.get('x-dev-user-id');
  
  // Try normal JWT authentication first
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user?.id) {
      return { user, isDevUser: false };
    }
  }
  
  // Allow dev user override for whitelisted users
  if (devUserId && KNOWN_DEV_USERS.includes(devUserId)) {
    return { 
      user: { id: devUserId, email: `dev-${devUserId}@demo.com` }, 
      isDevUser: true 
    };
  }
  
  throw new Error('Authentication required - invalid or missing credentials');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user (supports both JWT and dev user override)
    const { user, isDevUser } = await authenticateUser(req);
    console.log(`User authenticated: ${user.id} (dev: ${isDevUser})`);

    const { trackId, userAge } = await req.json();

    if (!trackId) {
      throw new Error('Missing required track ID');
    }

    console.log(`Analyzing career risk for user ${user.id}, track ${trackId}`);

    // Get track details
    const { data: track, error: trackError } = await supabase
      .from('career_tracks')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', user.id)
      .single();

    if (trackError || !track) {
      throw new Error('Track not found');
    }

    // Get track skills
    const { data: trackSkills, error: skillsError } = await supabase
      .from('track_skills')
      .select('skill_node_id')
      .eq('track_id', trackId);

    if (skillsError) {
      throw new Error('Failed to fetch track skills');
    }

    const skillIds = trackSkills?.map(s => s.skill_node_id) || [];

    // Get automation risk for skills - query nodes directly by automation_risk_pct
    const { data: skillNodes, error: skillNodesError } = await supabase
      .from('career_graph_nodes')
      .select('automation_risk_pct')
      .in('id', skillIds)
      .not('automation_risk_pct', 'is', null);

    if (skillNodesError) {
      console.error('Skill nodes query error:', skillNodesError);
    }

    // Calculate AI job risk from skill nodes
    const avgAutomationRisk = skillNodes && skillNodes.length > 0 
      ? skillNodes.reduce((sum, node) => sum + (node.automation_risk_pct || 0), 0) / skillNodes.length
      : 25; // Default moderate risk

    // Get age penalty factor using the correct SQL function
    const age = userAge || 30; // Default age
    const { data: agePenaltyResult, error: ageError } = await supabase
      .rpc('get_age_penalty', { p_age: age });

    const agePenaltyFactor = agePenaltyResult || 1.0;

    // Calculate switch risk (simplified)
    const switchRiskScore = Math.min(100, 
      (100 - (track.switch_readiness_score || 0)) + 
      (avgAutomationRisk * 0.5) + 
      ((agePenaltyFactor - 1) * 50)
    );

    // Calculate ROI volatility (deterministic - based on market factors, no randomness)
    const baseVolatility = Math.min(100, 
      (avgAutomationRisk * 0.8) + 
      (switchRiskScore * 0.3) + 
      20 // Fixed market uncertainty factor instead of random
    );
    
    const roiVolatility = Math.round(baseVolatility);

    // CRI mismatch (simplified calculation)
    const criMismatch = Math.max(0, 
      100 - (track.roi_score || 0) - (track.switch_readiness_score || 0)
    );

    // Risk breakdown
    const riskBreakdown = {
      automation_risk: Math.round(avgAutomationRisk),
      age_penalty_impact: Math.round((agePenaltyFactor - 1) * 100),
      switch_difficulty: Math.round(switchRiskScore),
      market_volatility: Math.round(roiVolatility * 0.6),
      skill_mismatch: Math.round(criMismatch * 0.4)
    };

    const riskData = {
      user_id: user.id,
      track_id: trackId,
      ai_job_risk_pct: avgAutomationRisk,
      age_penalty_factor: agePenaltyFactor,
      switch_risk_score: switchRiskScore,
      roi_volatility: roiVolatility,
      cri_mismatch: criMismatch,
      risk_breakdown: riskBreakdown
    };

    // Insert the risk analysis
    const { data: insertedRisk, error: insertError } = await supabase
      .from('career_risks')
      .insert(riskData)
      .select()
      .single();

    if (insertError) {
      console.error('Risk insert error:', insertError);
      throw new Error('Failed to save risk analysis');
    }

    // Calculate overall risk score (weighted average)
    const overallRisk = Math.round(
      (avgAutomationRisk * 0.3) +
      (switchRiskScore * 0.25) +
      (roiVolatility * 0.25) +
      (criMismatch * 0.2)
    );

    console.log('Career risk analyzed successfully:', insertedRisk.id);

    return new Response(JSON.stringify({
      riskId: insertedRisk.id,
      overallRisk,
      riskLevel: overallRisk > 70 ? 'High' : overallRisk > 40 ? 'Medium' : 'Low',
      breakdown: riskBreakdown,
      factors: {
        aiJobRisk: Math.round(avgAutomationRisk),
        agePenaltyFactor,
        switchDifficulty: Math.round(switchRiskScore),
        roiVolatility: Math.round(roiVolatility),
        criMismatch: Math.round(criMismatch)
      },
      trackTitle: track.title
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in career-risk-analyzer:', error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
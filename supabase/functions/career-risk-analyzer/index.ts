import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { badRequest, unauthorized, notFound, forbidden, serverError, success, corsHeaders } from '../_shared/responseHelpers.ts';

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
    return new Response(null, { status: 204, headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
    }});
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Career risk analyzer function called`);
    console.log(`[${requestId}] Request headers:`, Object.fromEntries(req.headers.entries()));
    
    // Authenticate user
    let user, isDevUser;
    try {
      const auth = await authenticateUser(req);
      user = auth.user;
      isDevUser = auth.isDevUser;
      console.log(`[${requestId}] User authenticated: ${user.id} (dev: ${isDevUser})`);
    } catch (e) {
      console.error(`[${requestId}] Authentication failed:`, e instanceof Error ? e.message : 'Unknown error');
      return unauthorized('Authentication required');
    }

    // Enhanced body parsing with multiple safety checks
    let body: any;
    let rawBody: string = '';
    try {
      rawBody = await req.text();
      console.log(`[${requestId}] Raw request body: "${rawBody}" (length: ${rawBody?.length || 0})`);
      
      // Multiple checks for empty body conditions
      if (!rawBody || rawBody.trim() === '' || rawBody === 'null' || rawBody === 'undefined') {
        console.error(`[${requestId}] Empty/null body detected - rawBody: "${rawBody}"`);
        return badRequest('No JSON body provided', ['trackId']);
      }
      
      // Check for minimum viable JSON
      if (rawBody.length < 2) {
        console.error(`[${requestId}] Body too short: ${rawBody.length} characters`);
        return badRequest('Request body too short', ['trackId']);
      }
      
      body = JSON.parse(rawBody); 
      console.log(`[${requestId}] Body parsed successfully:`, { 
        keys: Object.keys(body || {}),
        type: typeof body,
        hasTrackId: !!body?.trackId
      });
      
      // Validate parsed body is an object
      if (!body || typeof body !== 'object') {
        console.error(`[${requestId}] Body is not an object: ${typeof body}`);
        return badRequest('Request body must be a JSON object', ['trackId']);
      }
      
    } catch (parseError) { 
      console.error(`[${requestId}] JSON parsing failed:`, parseError instanceof Error ? parseError.message : 'Unknown error', `Raw length: ${rawBody?.length || 0}`);
      return badRequest('Invalid JSON body');
    }

    // Handle ping requests for debugging
    if (body?.action === 'ping') {
      console.log(`[${requestId}] Ping request received`);
      return success({ ok: true, userId: user.id, ts: Date.now(), requestId });
    }

    const { trackId, userAge } = body;
    console.log(`[${requestId}] Extracted parameters:`, { trackId, userAge });
    
    if (!trackId) {
      console.error(`[${requestId}] Missing required trackId`);
      return badRequest('Track ID is required', ['trackId']);
    }

    console.log(`[${requestId}] Analyzing career risk for user ${user.id}, track ${trackId}`);

    // Get track details with better error handling
    const { data: track, error: trackError } = await supabase
      .from('career_tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError) {
      console.error('Database error fetching track:', trackError);
      return serverError(trackError);
    }
    
    if (!track) {
      return notFound('Track not found', { trackId });
    }

    // Verify track ownership
    if (track.user_id !== user.id) {
      return forbidden('Track does not belong to current user', { trackId });
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

    // Get automation risk from seeded data - query skill_automation_risk table
    const { data: skillAutomationData, error: automationError } = await supabase
      .from('skill_automation_risk')
      .select('automation_risk_pct')
      .in('skill_id', skillIds);

    if (automationError) {
      console.error('Skill automation risk query error:', automationError);
    }

    // Calculate AI job risk from seeded data, fallback to nodes if needed
    let avgAutomationRisk = 25; // Default moderate risk
    
    if (skillAutomationData && skillAutomationData.length > 0) {
      avgAutomationRisk = skillAutomationData.reduce((sum, skill) => sum + (skill.automation_risk_pct || 0), 0) / skillAutomationData.length;
    } else {
      // Fallback to nodes if no seeded data
      const { data: skillNodes, error: skillNodesError } = await supabase
        .from('career_graph_nodes')
        .select('automation_risk_pct')
        .in('id', skillIds)
        .not('automation_risk_pct', 'is', null);

      if (skillNodes && skillNodes.length > 0) {
        avgAutomationRisk = skillNodes.reduce((sum, node) => sum + (node.automation_risk_pct || 0), 0) / skillNodes.length;
      }
    }

    // Get age penalty factor using the correct SQL function
    const age = userAge || 30; // Default age
    const { data: agePenaltyResult, error: ageError } = await supabase
      .rpc('get_age_penalty', { age_int: age });

    if (ageError) {
      console.error('Age penalty query error:', ageError);
    }

    // Load AGE_PENALTY_CAP from app_config (fallback 1.5)
    let agePenaltyCap = 1.5;
    const { data: cfg } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'switching')
      .maybeSingle();
    if (cfg?.config_value?.AGE_PENALTY_CAP) {
      agePenaltyCap = Number(cfg.config_value.AGE_PENALTY_CAP) || 1.5;
    }

    const rawAgePenaltyFactor = agePenaltyResult || 1.0;
    const agePenaltyFactor = Math.min(rawAgePenaltyFactor, agePenaltyCap);

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

    console.log(`[${requestId}] Career risk analyzed successfully:`, insertedRisk.id);

    const responseData = {
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
      trackTitle: track.title,
      requestId
    };
    
    console.log(`[${requestId}] Response data:`, responseData);
    return success(responseData);

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error in career-risk-analyzer:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return serverError({ message: error instanceof Error ? error.message : 'Unknown error occurred', errorId });
  }
});
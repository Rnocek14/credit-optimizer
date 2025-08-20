import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user?.id) {
      throw new Error('Invalid user');
    }

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

    // Get automation risk for skills
    const { data: automationRisks, error: automationError } = await supabase
      .from('skill_automation_risk')
      .select('*')
      .in('skill_id', skillIds);

    if (automationError) {
      console.error('Automation risk query error:', automationError);
    }

    // Calculate AI job risk
    const avgAutomationRisk = automationRisks && automationRisks.length > 0 
      ? automationRisks.reduce((sum, risk) => sum + (risk.risk_percentage || 0), 0) / automationRisks.length
      : 25; // Default moderate risk

    // Get age penalty factor
    const age = userAge || 30; // Default age
    const { data: agePenalty, error: ageError } = await supabase
      .from('age_penalty_curves')
      .select('penalty_factor')
      .lte('age_min', age)
      .gte('age_max', age)
      .single();

    const agePenaltyFactor = agePenalty?.penalty_factor || 1.0;

    // Calculate switch risk (simplified)
    const switchRiskScore = Math.min(100, 
      (100 - (track.switch_readiness_score || 0)) + 
      (avgAutomationRisk * 0.5) + 
      ((agePenaltyFactor - 1) * 50)
    );

    // Calculate ROI volatility (based on market factors)
    const roiVolatility = Math.min(100, 
      (avgAutomationRisk * 0.8) + 
      (switchRiskScore * 0.3) + 
      Math.random() * 20 // Market uncertainty factor
    );

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
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
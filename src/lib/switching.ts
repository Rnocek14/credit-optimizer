import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authHelper";

export interface CareerSwitchMetrics {
  skillOverlap: number;
  transferCredit: number;
  timeGained: number;
  timeLost: number;
  switchCost: number;
  roi3yr: number;
  breakEvenMonths: number;
  criDelta: number;
}

export interface CareerRiskAnalysis {
  overallRisk: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  breakdown: {
    automation_risk: number;
    age_penalty_impact: number;
    switch_difficulty: number;
    market_volatility: number;
    skill_mismatch: number;
  };
  factors: {
    aiJobRisk: number;
    agePenaltyFactor: number;
    switchDifficulty: number;
    roiVolatility: number;
    criMismatch: number;
  };
}

export interface CareerSwitchAnalysis {
  switchId: string;
  metrics: CareerSwitchMetrics;
  riskAnalysis: CareerRiskAnalysis;
  tracks: {
    from: string;
    to: string;
  };
}

export const analyzeCareerSwitch = async (
  fromTrackId: string,
  toTrackId: string,
  locationId?: string,
  userAge?: number
): Promise<CareerSwitchAnalysis> => {
  console.log('Starting career switch analysis:', { fromTrackId, toTrackId, locationId, userAge });

  if (!fromTrackId || !toTrackId) {
    throw new Error('Both source and target track IDs are required');
  }

  if (fromTrackId === toTrackId) {
    throw new Error('Source and target tracks cannot be the same');
  }

  // Get current user (supports both real users and dev users)
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('You must be logged in to analyze career switches');
  }

  console.log(`User authenticated: ${user.id} (dev: ${user.isDevUser})`);

  try {
    // Prepare headers for function calls
    const headers: Record<string, string> = {};
    if (user.isDevUser) {
      headers['x-dev-user-id'] = user.id;
    }

    // Call the calculate-career-switch edge function
    console.log('Calling calculate-career-switch function');
    const { data: switchData, error: switchError } = await supabase.functions.invoke('calculate-career-switch', {
      body: { 
        fromTrackId, 
        toTrackId, 
        locationId: locationId || null 
      },
      headers: user.isDevUser ? headers : undefined
    });

    if (switchError) {
      console.error('Switch calculation error:', switchError);
      throw new Error(switchError.message || 'Failed to calculate career switch metrics');
    }

    if (!switchData || switchData.error) {
      console.error('Switch calculation returned error:', switchData?.error);
      
      // Provide more specific error messages
      if (switchData?.error?.includes('No career tracks found')) {
        throw new Error('The selected career tracks were not found. Please ensure you have created both source and target tracks.');
      }
      if (switchData?.error?.includes('belong to your account')) {
        throw new Error('You can only analyze switches between your own career tracks.');
      }
      
      throw new Error(switchData?.error || 'Failed to calculate career switch');
    }

    console.log('Switch calculation completed:', switchData);

    // Call the career-risk-analyzer edge function  
    console.log('Calling career-risk-analyzer function');
    const { data: riskData, error: riskError } = await supabase.functions.invoke('career-risk-analyzer', {
      body: { 
        trackId: toTrackId,
        userAge: userAge || 30
      },
      headers: user.isDevUser ? headers : undefined
    });

    if (riskError) {
      console.error('Risk analysis error:', riskError);
      // Don't fail the entire analysis if risk calculation fails
      console.warn('Risk analysis failed, continuing with switch metrics only');
    }

    console.log('Risk analysis completed:', riskData);

    return {
      switchId: switchData.switchId,
      metrics: switchData.metrics,
      riskAnalysis: riskData && !riskData.error ? {
        overallRisk: riskData.overallRisk || 0,
        riskLevel: riskData.riskLevel || 'Unknown',
        breakdown: riskData.breakdown || {},
        factors: riskData.factors || {}
      } : {
        overallRisk: 0,
        riskLevel: 'Unknown',
        breakdown: {},
        factors: {}
      },
      tracks: switchData.tracks
    };

  } catch (error) {
    console.error('Career switch analysis failed:', error);
    
    if (error instanceof Error) {
      // Re-throw known errors with better context
      if (error.message.includes('tracks not found') || error.message.includes('No career tracks found')) {
        throw new Error('The selected career tracks were not found. Please ensure you have access to both tracks.');
      }
      if (error.message.includes('belong to your account')) {
        throw new Error('You can only analyze switches between your own career tracks.');
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred during career switch analysis');
  }
};

export const getUserCareerTracks = async () => {
  // Get current user with auth check
  const user = await getCurrentUser();
  if (!user) {
    console.warn('No authenticated user found for getUserCareerTracks');
    return [];
  }

  const { data, error } = await supabase
    .from('career_tracks')
    .select('id, title, description, roi_score, switch_readiness_score')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('order_index');

  if (error) {
    throw new Error(`Failed to fetch career tracks: ${error.message}`);
  }

  return data || [];
};
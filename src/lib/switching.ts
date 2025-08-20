import { supabase } from "@/integrations/supabase/client";

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
  try {
    // Calculate career switch metrics
    const { data: switchData, error: switchError } = await supabase.functions.invoke(
      'calculate-career-switch',
      {
        body: {
          fromTrackId,
          toTrackId,
          locationId
        }
      }
    );

    if (switchError) {
      throw new Error(`Switch calculation failed: ${switchError.message}`);
    }

    // Analyze career risk for the target track
    const { data: riskData, error: riskError } = await supabase.functions.invoke(
      'career-risk-analyzer',
      {
        body: {
          trackId: toTrackId,
          userAge
        }
      }
    );

    if (riskError) {
      throw new Error(`Risk analysis failed: ${riskError.message}`);
    }

    return {
      switchId: switchData.switchId,
      metrics: switchData.metrics,
      riskAnalysis: {
        overallRisk: riskData.overallRisk,
        riskLevel: riskData.riskLevel,
        breakdown: riskData.breakdown,
        factors: riskData.factors
      },
      tracks: switchData.tracks
    };
  } catch (error) {
    console.error('Career switch analysis error:', error);
    throw error;
  }
};

export const getUserCareerTracks = async () => {
  const { data, error } = await supabase
    .from('career_tracks')
    .select('id, title, description, roi_score, switch_readiness_score')
    .eq('archived', false)
    .order('order_index');

  if (error) {
    throw new Error(`Failed to fetch career tracks: ${error.message}`);
  }

  return data || [];
};
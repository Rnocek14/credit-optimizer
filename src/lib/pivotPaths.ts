import { supabase } from "@/integrations/supabase/client";

export interface PivotPathRequest {
  current_career: string;
  user_skills: string[];
  preferred_locations: string[];
}

export interface PivotPath {
  new_career: string;
  shared_skills: string[];
  missing_skills: string[];
  roi_score: number;
  estimated_time: string;
  estimated_cost: string;
  reasoning: string;
}

export interface PivotPathResponse {
  pivots: PivotPath[];
}

export const recommendPivotPaths = async (request: PivotPathRequest): Promise<PivotPathResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('recommend-pivot-paths', {
      body: request
    });

    if (error) {
      throw new Error(`Failed to get pivot recommendations: ${error.message}`);
    }

    return data as PivotPathResponse;
  } catch (error) {
    console.error('Error calling recommend-pivot-paths:', error);
    throw error;
  }
};
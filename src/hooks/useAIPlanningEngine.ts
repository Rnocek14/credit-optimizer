import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PathNode {
  id: string;
  title: string;
  type: string;
  time_cost_hours: number;
  monetary_cost: number;
  roi_score: number;
  difficulty_level: number;
}

export interface LearningPath {
  id: string;
  nodes: PathNode[];
  total_time: number;
  total_cost: number;
  average_roi: number;
  path_type: 'fastest' | 'cheapest' | 'highest_roi';
}

export interface UnlockAnalysis {
  unlockedJobs: Array<{
    job: any;
    completionPercentage: number;
    missingSkills: number;
  }>;
  partiallyQualifiedJobs: Array<{
    job: any;
    completionPercentage: number;
    missingSkills: number;
  }>;
  recommendedCourses: any[];
  summary: {
    totalUnlocked: number;
    totalPartial: number;
    completedSkillsCount: number;
    completedCoursesCount: number;
  };
}

export function useAIPlanningEngine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBackwardPlan = useCallback(async (
    targetJob: string,
    userContext: any = {}
  ): Promise<LearningPath[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Generating backward plan for:', targetJob);
      
      const { data, error: functionError } = await supabase.functions.invoke('ai-planning-engine', {
        body: {
          operation: 'backward_planning',
          target_job: targetJob,
          user_context: userContext
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate learning plan');
      }

      if (!data.success) {
        throw new Error(data.error || 'Planning engine returned an error');
      }

      console.log(`Generated ${data.paths.length} learning paths`);
      return data.paths;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate learning plan';
      console.error('Error generating backward plan:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeUnlocks = useCallback(async (
    completedSkills: string[] = [],
    completedCourses: string[] = []
  ): Promise<UnlockAnalysis | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Analyzing unlocks for skills/courses:', completedSkills.length, completedCourses.length);
      
      const { data, error: functionError } = await supabase.functions.invoke('ai-planning-engine', {
        body: {
          operation: 'unlock_analysis',
          completed_skills: completedSkills,
          completed_courses: completedCourses
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to analyze unlocks');
      }

      if (!data.success) {
        throw new Error(data.error || 'Unlock analysis returned an error');
      }

      console.log('Unlock analysis completed:', data.analysis.summary);
      return data.analysis;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze unlocks';
      console.error('Error analyzing unlocks:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    generateBackwardPlan,
    analyzeUnlocks,
    clearError
  };
}
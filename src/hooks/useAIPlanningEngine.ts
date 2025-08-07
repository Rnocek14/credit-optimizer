import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useModelRouter } from './useModelRouter';

export interface PathNode {
  id: string;
  title: string;
  type: string;
  estimated_time_hours: number;
  cost_estimate: number;
  market_demand_score: number;
  difficulty_level: number;
}

export interface LearningPath {
  id: string;
  nodes: PathNode[];
  total_time: number;
  total_cost: number;
  average_roi: number;
  path_type: 'fastest' | 'cheapest' | 'highest_roi' | 'easiest';
  confidence_score: number;
  pivot_score?: number;
  substitution_options?: PathNode[][];
}

export interface PlanningError {
  error: string;
  suggestions?: string[];
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { jsonCompletion } = useModelRouter();

  const generateBackwardPlan = useCallback(async (
    targetJob: string,
    userContext: any = {}
  ): Promise<LearningPath[]> => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    
    try {
      console.log('Generating backward plan for:', targetJob);
      
      // First try the enhanced model router with structured JSON schema
      const routerResponse = await jsonCompletion(
        `Generate a comprehensive backward learning plan for the target job: "${targetJob}".
        
        User Context: ${JSON.stringify(userContext)}
        
        Create multiple learning paths optimized for different priorities:
        1. Fastest path to employment (prioritizes essential skills and certifications)
        2. Most cost-effective path (minimizes financial investment)
        3. Highest ROI path (balances time, cost, and earning potential)
        4. Easiest path (focuses on approachable skills with gradual difficulty progression)
        
        For each path, include realistic time estimates, costs, and market demand scores.`,
        {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  path_type: { type: "string", enum: ["fastest", "cheapest", "highest_roi", "easiest"] },
                  total_time: { type: "number", description: "Total weeks to complete" },
                  total_cost: { type: "number", description: "Total cost in USD" },
                  average_roi: { type: "number", description: "ROI score 0-100" },
                  confidence_score: { type: "number", description: "Confidence 0-1" },
                  nodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        type: { type: "string", enum: ["course", "certification", "project", "skill"] },
                        estimated_time_hours: { type: "number" },
                        cost_estimate: { type: "number" },
                        market_demand_score: { type: "number", description: "Score 0-100" },
                        difficulty_level: { type: "number", description: "Difficulty 1-5" }
                      },
                      required: ["id", "title", "type", "estimated_time_hours", "cost_estimate", "market_demand_score", "difficulty_level"]
                    }
                  }
                },
                required: ["id", "path_type", "total_time", "total_cost", "average_roi", "confidence_score", "nodes"]
              }
            },
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Additional recommendations or alternative approaches"
            }
          },
          required: ["paths"]
        },
        { complexity: 'high' }
      );

      if (routerResponse?.message?.content) {
        const parsedData = JSON.parse(routerResponse.message.content);
        const paths: LearningPath[] = parsedData.paths || [];
        
        if (parsedData.suggestions) {
          setSuggestions(parsedData.suggestions);
        }
        
        console.log(`Generated ${paths.length} learning paths via model router`);
        return paths;
      }
      
      // Fallback to original edge function
      console.log('Model router failed, falling back to edge function');
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
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        throw new Error(data.error || 'Planning engine returned an error');
      }

      console.log(`Generated ${data.paths.length} learning paths via edge function`);
      setSuggestions([]);
      return data.paths;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate learning plan';
      console.error('Error generating backward plan:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [jsonCompletion]);

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
    setSuggestions([]);
  }, []);

  return {
    loading,
    error,
    suggestions,
    generateBackwardPlan,
    analyzeUnlocks,
    clearError
  };
}
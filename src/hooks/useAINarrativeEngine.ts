import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import type { SemanticPath, SemanticNode } from '@/types/semantic';

interface NarrativeContext {
  currentPath?: SemanticPath;
  selectedNode?: SemanticNode;
  userGoals?: string[];
  previousInteractions?: string[];
}

interface NarrativeResponse {
  explanation: string;
  insights: string[];
  recommendations: string[];
  confidence_score: number;
  context_awareness: number;
}

export const useAINarrativeEngine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<NarrativeResponse | null>(null);
  const { state } = useUnifiedData();

  const generatePathNarrative = useCallback(async (
    path: SemanticPath, 
    context?: Partial<NarrativeContext>
  ): Promise<NarrativeResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const narrativeContext: NarrativeContext = {
        currentPath: path,
        userGoals: state.currentGoal ? [state.currentGoal] : [],
        ...context
      };

      const { data, error: functionError } = await supabase.functions.invoke(
        'enhanced-maya-response',
        {
          body: {
            request: `Analyze this learning path and provide a comprehensive narrative explanation`,
            context: {
              path_metadata: path.metadata,
              node_count: path.nodes.length,
              total_duration: path.metadata.total_duration,
              confidence_score: path.metadata.confidence_score,
              user_context: narrativeContext,
              analysis_type: 'path_narrative'
            }
          }
        }
      );

      if (functionError) throw functionError;

      const response: NarrativeResponse = {
        explanation: data?.response || "This learning path provides a structured approach to your career goals.",
        insights: data?.insights || [],
        recommendations: data?.autonomous_actions?.map((a: any) => a.description) || [],
        confidence_score: data?.analysis?.confidence || path.metadata.confidence_score,
        context_awareness: data?.analysis?.context_relevance || 0.8
      };

      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate narrative';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.currentGoal]);

  const generateNodeExplanation = useCallback(async (
    node: SemanticNode,
    pathContext?: SemanticPath
  ): Promise<NarrativeResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'enhanced-maya-response',
        {
          body: {
            request: `Explain why this ${node.type} is important in the learning journey`,
            context: {
              node_details: {
                title: node.title,
                type: node.type,
                difficulty: node.metadata.difficulty,
                confidence: node.metadata.confidence_score
              },
              path_context: pathContext?.metadata,
              analysis_type: 'node_explanation'
            }
          }
        }
      );

      if (functionError) throw functionError;

      const response: NarrativeResponse = {
        explanation: data?.response || `This ${node.type} is a key step in your learning journey.`,
        insights: data?.insights || [],
        recommendations: data?.autonomous_actions?.map((a: any) => a.description) || [],
        confidence_score: data?.analysis?.confidence || node.metadata.confidence_score || 0.7,
        context_awareness: data?.analysis?.context_relevance || 0.8
      };

      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate explanation';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDecisionGuidance = useCallback(async (
    options: { path: SemanticPath; alternatives?: SemanticPath[] }
  ): Promise<NarrativeResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'enhanced-maya-response',
        {
          body: {
            request: 'Help me understand the trade-offs between these learning path options',
            context: {
              primary_path: options.path.metadata,
              alternatives: options.alternatives?.map(alt => alt.metadata) || [],
              decision_factors: {
                time_constraints: undefined, // TODO: Add to unified state
                budget_limits: undefined, // TODO: Add to unified state  
                career_goals: state.currentGoal
              },
              analysis_type: 'decision_guidance'
            }
          }
        }
      );

      if (functionError) throw functionError;

      const response: NarrativeResponse = {
        explanation: data?.response || "Here's my analysis of your learning path options.",
        insights: data?.insights || [],
        recommendations: data?.autonomous_actions?.map((a: any) => a.description) || [],
        confidence_score: data?.analysis?.confidence || 0.8,
        context_awareness: data?.analysis?.context_relevance || 0.9
      };

      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate decision guidance';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.currentGoal]);

  const generateProgressInsights = useCallback(async (
    completedNodes: SemanticNode[],
    remainingPath: SemanticNode[]
  ): Promise<NarrativeResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'enhanced-maya-response',
        {
          body: {
            request: 'Analyze my learning progress and provide insights for next steps',
            context: {
              completed_count: completedNodes.length,
              remaining_count: remainingPath.length,
              completion_rate: completedNodes.length / (completedNodes.length + remainingPath.length),
              recent_completions: completedNodes.slice(-3).map(n => ({ title: n.title, type: n.type })),
              upcoming_milestones: remainingPath.slice(0, 3).map(n => ({ title: n.title, type: n.type })),
              analysis_type: 'progress_insights'
            }
          }
        }
      );

      if (functionError) throw functionError;

      const response: NarrativeResponse = {
        explanation: data?.response || "You're making excellent progress on your learning journey.",
        insights: data?.insights || [],
        recommendations: data?.autonomous_actions?.map((a: any) => a.description) || [],
        confidence_score: data?.analysis?.confidence || 0.8,
        context_awareness: data?.analysis?.context_relevance || 0.9
      };

      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate progress insights';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    lastResponse,
    generatePathNarrative,
    generateNodeExplanation,
    generateDecisionGuidance,
    generateProgressInsights
  };
};
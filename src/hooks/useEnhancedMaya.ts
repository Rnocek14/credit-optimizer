import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

interface EnhancedMayaResponse {
  response: string;
  realTimeData: any;
  autonomousActions: any[];
  requestAnalysis: any;
  timestamp: string;
}

interface MayaContext {
  careerPath?: string;
  location?: string;
  goals?: any[];
  skillLevel?: number;
  marketPreferences?: any;
}

export function useEnhancedMaya() {
  const { state } = useUnifiedData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<EnhancedMayaResponse | null>(null);

  const sendEnhancedRequest = useCallback(async (
    request: string,
    context?: MayaContext
  ): Promise<EnhancedMayaResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Sending enhanced Maya request:', request);

      // Prepare comprehensive context
      const enhancedContext = {
        profile: state.user || {},
        goals: state.currentGoal ? [{ target_role: state.currentGoal }] : [],
        level: { current_level: 1, total_xp: 0 }, // Would come from user data
        marketPreferences: {
          preferredLocations: [state.selectedLocation || 'United States'],
          careerInterests: [state.selectedCareerPath || 'General']
        },
        criScore: 75, // Would come from user data
        readinessScore: 80, // Would come from user data
        ...context
      };

      // Call the enhanced Maya response function
      const { data, error: functionError } = await supabase.functions.invoke('enhanced-maya-response', {
        body: {
          request,
          userId: state.user?.id || 'demo-user',
          context: enhancedContext
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to get enhanced response');
      }

      console.log('✅ Enhanced Maya response received:', data);
      setLastResponse(data);
      return data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send request';
      console.error('❌ Enhanced Maya error:', err);
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [state]);

  const askAboutCareerTransition = useCallback(async (
    targetRole: string,
    location: string,
    timeframe: string
  ) => {
    const request = `Create a personalized career workflow to become a ${targetRole} in ${location} over the next ${timeframe}. Include market analysis, skill gap analysis, a learning plan, and set alerts if demand drops.`;
    
    return await sendEnhancedRequest(request, {
      careerPath: targetRole,
      location,
      goals: [{ target_role: targetRole }]
    });
  }, [sendEnhancedRequest]);

  const getMarketIntelligence = useCallback(async (
    careerPath: string,
    location: string
  ) => {
    const request = `Provide current market intelligence for ${careerPath} positions in ${location}, including salary trends, demand forecasting, and competitive analysis.`;
    
    return await sendEnhancedRequest(request, {
      careerPath,
      location
    });
  }, [sendEnhancedRequest]);

  const analyzeSkillGaps = useCallback(async (
    targetRole: string,
    currentSkills: string[]
  ) => {
    const request = `Analyze my skill gaps for becoming a ${targetRole}. My current skills are: ${currentSkills.join(', ')}. Provide a specific development plan with timelines.`;
    
    return await sendEnhancedRequest(request, {
      careerPath: targetRole,
      goals: [{ target_role: targetRole }]
    });
  }, [sendEnhancedRequest]);

  const requestCareerGuidance = useCallback(async (
    specificQuestion: string
  ) => {
    return await sendEnhancedRequest(specificQuestion);
  }, [sendEnhancedRequest]);

  const createLearningPlan = useCallback(async (
    skills: string[],
    timeframe: string
  ) => {
    const request = `Create a comprehensive learning plan to master these skills: ${skills.join(', ')} within ${timeframe}. Include specific courses, projects, and milestones.`;
    
    return await sendEnhancedRequest(request);
  }, [sendEnhancedRequest]);

  const getPersonalizedRecommendations = useCallback(async () => {
    const request = `Based on my current profile, goals, and market conditions, what are my top 3 personalized career recommendations for the next 6 months?`;
    
    return await sendEnhancedRequest(request);
  }, [sendEnhancedRequest]);

  // Enhanced response analysis
  const getResponseInsights = useCallback(() => {
    if (!lastResponse) return null;

    const { realTimeData, autonomousActions, requestAnalysis } = lastResponse;

    return {
      hasMarketData: !!realTimeData?.marketData,
      hasSkillAnalysis: !!realTimeData?.skillGaps,
      hasPredictions: !!realTimeData?.predictions,
      hasPersonalizedInsights: !!realTimeData?.personalized,
      
      autonomousActionsCount: autonomousActions?.length || 0,
      workflowCreated: autonomousActions?.some(action => action.type === 'workflow_created'),
      alertsCreated: autonomousActions?.some(action => action.type === 'alert_created'),
      
      requestComplexity: requestAnalysis?.complexityScore || 0,
      requestType: requestAnalysis?.requestType || 'general',
      shouldFollowUp: requestAnalysis?.shouldCreateWorkflow,
      
      marketHealthScore: realTimeData?.marketData?.currentDemand || 0,
      skillAlignment: realTimeData?.skillGaps?.skillAlignment || 0,
      careerReadiness: realTimeData?.personalized?.readinessScore || 0
    };
  }, [lastResponse]);

  return {
    // Core functions
    sendEnhancedRequest,
    askAboutCareerTransition,
    getMarketIntelligence,
    analyzeSkillGaps,
    requestCareerGuidance,
    createLearningPlan,
    getPersonalizedRecommendations,
    
    // State
    loading,
    error,
    lastResponse,
    
    // Analysis
    getResponseInsights,
    
    // Utilities
    isReady: !loading,
    hasRecentResponse: !!lastResponse,
    lastResponseTime: lastResponse?.timestamp
  };
}
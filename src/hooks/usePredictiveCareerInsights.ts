import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedMaya } from './useEnhancedMaya';
import { useMayaCRIIntegration } from './useMayaCRIIntegration';
import { useMarketIntelligence } from './useMarketIntelligence';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

interface PredictiveInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'milestone';
  title: string;
  description: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  predictedTimeframe: string;
  actionItems: string[];
  marketFactors: string[];
  personalFactors: string[];
  potentialImpact: {
    careerGrowth: number;
    salaryIncrease: number;
    marketRelevance: number;
  };
}

interface PatternAnalysis {
  learningVelocity: number;
  engagementTrends: string[];
  skillGapEvolution: string[];
  careerProgressionRate: number;
  marketAlignmentScore: number;
}

export function usePredictiveCareerInsights() {
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const { sendEnhancedRequest } = useEnhancedMaya();
  const { insights: criInsights, trajectory } = useMayaCRIIntegration();
  const { marketData } = useMarketIntelligence();
  const { state } = useUnifiedData();

  const analyzeUserPatterns = useCallback(async () => {
    try {
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get real course progress data
      const { data: courseProgress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.user.id);

      // Get learning milestones
      const { data: milestones } = await supabase
        .from('learning_milestones')
        .select('*')
        .eq('user_id', user.user.id)
        .order('achieved_at', { ascending: false })
        .limit(20);

      // Calculate real learning velocity from actual data
      const completedCourses = courseProgress?.filter(p => p.status === 'completed') || [];
      const avgCompletionTime = completedCourses.length > 0 
        ? completedCourses.reduce((sum, course) => {
            const started = new Date(course.started_at);
            const completed = new Date(course.completed_at);
            return sum + (completed.getTime() - started.getTime());
          }, 0) / completedCourses.length / (1000 * 60 * 60 * 24) // days
        : 30; // default

      const learningVelocity = Math.min(1, Math.max(0, 1 - (avgCompletionTime / 30)));
      
      const patternData: PatternAnalysis = {
        learningVelocity,
        engagementTrends: milestones?.length > 10 ? ['high_engagement'] : ['moderate_engagement'],
        skillGapEvolution: completedCourses.length > 5 ? ['improving'] : ['developing'],
        careerProgressionRate: completedCourses.length / 10, // Normalize by expected courses
        marketAlignmentScore: 0.78 // Would come from market analysis
      };
      
      setPatterns(patternData);
      setIsUsingMockData(false);
      return patternData;
    } catch (error) {
      console.error('Error analyzing user patterns:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze patterns');
      
      // Fallback to mock data
      const mockPatterns: PatternAnalysis = {
        learningVelocity: 0.75,
        engagementTrends: ['moderate_engagement'],
        skillGapEvolution: ['developing'],
        careerProgressionRate: 0.5,
        marketAlignmentScore: 0.78
      };
      
      setPatterns(mockPatterns);
      setIsUsingMockData(true);
      return mockPatterns;
    }
  }, []);

  const generatePredictiveInsights = useCallback(async (): Promise<PredictiveInsight[]> => {
    if (!patterns) return [];

    try {
      setError(null);
      
      // Call enhanced-maya-response function for real AI analysis
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('enhanced-maya-response', {
        body: {
          request: `Based on learning patterns - velocity: ${patterns.learningVelocity}, progression rate: ${patterns.careerProgressionRate}, engagement: ${patterns.engagementTrends.join(', ')} - generate 4 predictive career insights focusing on opportunities, risks, optimizations, and milestones.`,
          context: {
            type: 'predictive_insights',
            patterns,
            marketData: state.marketData
          }
        }
      });

      if (aiError) {
        console.warn('AI function error, using fallback insights:', aiError);
        setIsUsingMockData(true);
      } else if (aiResponse?.insights) {
        setInsights(aiResponse.insights);
        setLastAnalysis(new Date());
        setIsUsingMockData(false);
        return aiResponse.insights;
      }

      // Fallback to structured mock insights
      const generatedInsights: PredictiveInsight[] = [
          {
            id: 'pred-001',
            type: 'opportunity',
            title: 'Emerging React Native Demand Spike',
            description: 'Market analysis predicts 40% increase in React Native positions in your location over next 6 months.',
            confidence: 0.87,
            urgency: 'medium',
            predictedTimeframe: '3-6 months',
            actionItems: [
              'Start React Native fundamentals course',
              'Build 2 mobile app prototypes',
              'Network with mobile development teams'
            ],
            marketFactors: ['mobile_first_trend', 'cross_platform_adoption', 'startup_mobile_focus'],
            personalFactors: ['strong_react_foundation', 'ui_design_skills', 'project_completion_rate'],
            potentialImpact: {
              careerGrowth: 0.65,
              salaryIncrease: 0.25,
              marketRelevance: 0.80
            }
          },
          {
            id: 'pred-002',
            type: 'risk',
            title: 'Potential Skill Obsolescence Warning',
            description: 'Your jQuery expertise may become less relevant. Industry moving toward modern frameworks.',
            confidence: 0.92,
            urgency: 'medium',
            predictedTimeframe: '12-18 months',
            actionItems: [
              'Prioritize modern JavaScript frameworks',
              'Migrate personal projects from jQuery',
              'Focus on component-based architecture'
            ],
            marketFactors: ['framework_modernization', 'performance_requirements', 'developer_productivity'],
            personalFactors: ['legacy_code_experience', 'adaptation_capability', 'learning_momentum'],
            potentialImpact: {
              careerGrowth: -0.30,
              salaryIncrease: -0.15,
              marketRelevance: -0.45
            }
          },
          {
            id: 'pred-003',
            type: 'optimization',
            title: 'Learning Path Efficiency Boost',
            description: 'Your current learning pattern suggests switching to project-based learning would accelerate progress by 35%.',
            confidence: 0.79,
            urgency: 'low',
            predictedTimeframe: '1-2 months',
            actionItems: [
              'Focus on building real projects',
              'Reduce theoretical course time',
              'Join collaborative coding projects'
            ],
            marketFactors: ['employer_portfolio_preference', 'practical_skills_demand'],
            personalFactors: ['hands_on_learning_preference', 'project_completion_success', 'creative_problem_solving'],
            potentialImpact: {
              careerGrowth: 0.35,
              salaryIncrease: 0.10,
              marketRelevance: 0.25
            }
          },
          {
            id: 'pred-004',
            type: 'milestone',
            title: 'Senior Developer Readiness Prediction',
            description: 'Based on current trajectory, you\'ll be ready for senior positions in 14 months with strategic skill building.',
            confidence: 0.84,
            urgency: 'low',
            predictedTimeframe: '12-16 months',
            actionItems: [
              'Build system architecture experience',
              'Mentor junior developers',
              'Lead a significant project'
            ],
            marketFactors: ['senior_role_demand', 'mentorship_value', 'leadership_premium'],
            personalFactors: ['technical_growth_rate', 'communication_skills', 'problem_solving_maturity'],
            potentialImpact: {
              careerGrowth: 0.85,
              salaryIncrease: 0.45,
              marketRelevance: 0.70
            }
          }
        ];

      setInsights(generatedInsights);
      setLastAnalysis(new Date());
      setIsUsingMockData(true);
      return generatedInsights;
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate insights');
      setIsUsingMockData(true);
      return [];
    }
  }, [patterns, state.marketData]);

  const runPredictiveAnalysis = useCallback(async () => {
    setLoading(true);
    await analyzeUserPatterns();
    await generatePredictiveInsights();
    setLoading(false);
  }, [analyzeUserPatterns, generatePredictiveInsights]);

  // Auto-run analysis when dependencies change
  useEffect(() => {
    if (criInsights.length > 0 || trajectory) {
      runPredictiveAnalysis();
    }
  }, [criInsights, trajectory, runPredictiveAnalysis]);

  const getInsightsByType = useCallback((type: PredictiveInsight['type']) => {
    return insights.filter(insight => insight.type === type);
  }, [insights]);

  const getHighPriorityInsights = useCallback(() => {
    return insights
      .filter(insight => insight.urgency === 'high' || insight.urgency === 'critical')
      .sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
  }, [insights]);

  const getInsightMetrics = useCallback(() => {
    if (insights.length === 0) return null;

    const avgConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length;
    const opportunityCount = insights.filter(i => i.type === 'opportunity').length;
    const riskCount = insights.filter(i => i.type === 'risk').length;
    const criticalCount = insights.filter(i => i.urgency === 'critical').length;

    return {
      totalInsights: insights.length,
      averageConfidence: avgConfidence,
      opportunityRatio: opportunityCount / insights.length,
      riskRatio: riskCount / insights.length,
      criticalAlerts: criticalCount,
      lastAnalyzed: lastAnalysis
    };
  }, [insights, lastAnalysis]);

  return {
    // Data
    insights,
    patterns,
    
    // Actions
    runPredictiveAnalysis,
    generatePredictiveInsights,
    
    // Utilities
    getInsightsByType,
    getHighPriorityInsights,
    getInsightMetrics,
    
    // State
    loading,
    error,
    isReady: !loading && insights.length > 0,
    lastAnalysis,
    isUsingMockData
  };
}
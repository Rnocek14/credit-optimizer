import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

interface PatternRecognition {
  id: string;
  pattern_type: 'seasonal' | 'trend' | 'volatility' | 'anomaly';
  career_path: string;
  location: string;
  pattern_data: any;
  confidence_score: number;
  detected_at: string;
  valid_until: string | null;
}

interface PredictiveAnalysis {
  career_path: string;
  location: string;
  predictions: {
    demand_forecast: {
      next_3_months: number;
      next_6_months: number;
      next_12_months: number;
      trend_direction: 'increasing' | 'stable' | 'decreasing';
      confidence: number;
    };
    salary_projection: {
      expected_change_3m: number;
      expected_change_6m: number;
      expected_change_12m: number;
      volatility_risk: 'low' | 'medium' | 'high';
      confidence: number;
    };
    market_dynamics: {
      competition_trend: 'increasing' | 'stable' | 'decreasing';
      skill_demand_shifts: Array<{
        skill: string;
        change: 'rising' | 'falling';
        impact: number;
      }>;
      emerging_opportunities: string[];
      risk_factors: string[];
    };
  };
  generated_at: string;
  accuracy_score: number;
}

interface PersonalizedRecommendation {
  id: string;
  type: 'skill_development' | 'career_move' | 'market_timing' | 'location_change';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact_score: number;
  effort_required: 'low' | 'medium' | 'high';
  timeline: string;
  action_items: string[];
  success_indicators: string[];
  related_data: any;
}

export function useEnhancedAIInsights() {
  const { state } = useUnifiedData();
  const [patterns, setPatterns] = useState<PatternRecognition[]>([]);
  const [predictions, setPredictions] = useState<PredictiveAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState({
    patterns: false,
    predictions: false,
    recommendations: false
  });
  const [errors, setErrors] = useState({
    patterns: null as string | null,
    predictions: null as string | null,
    recommendations: null as string | null
  });

  // Discover market patterns using AI pattern recognition
  const discoverMarketPatterns = useCallback(async (
    careerPath: string,
    location: string,
    analysisTypes: string[] = ['seasonal', 'trend', 'volatility', 'anomaly']
  ) => {
    setLoading(prev => ({ ...prev, patterns: true }));
    setErrors(prev => ({ ...prev, patterns: null }));

    try {
      console.log('🔍 Analyzing market patterns for:', { careerPath, location, analysisTypes });
      
      const { data, error } = await supabase.functions.invoke('pattern-recognition-engine', {
        body: {
          careerPath,
          location,
          timeframe: '90d',
          analysisTypes
        }
      });

      if (error) throw error;

      // Extract patterns from response
      const detectedPatterns: PatternRecognition[] = data?.patterns || [];
      
      setPatterns(detectedPatterns);
      console.log('✅ Market patterns discovered:', detectedPatterns.length);
      
      return detectedPatterns;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to analyze patterns';
      setErrors(prev => ({ ...prev, patterns: errorMsg }));
      console.error('❌ Pattern discovery error:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, patterns: false }));
    }
  }, []);

  // Generate predictive market analysis
  const generatePredictiveAnalysis = useCallback(async (
    careerPath: string,
    location: string,
    timeHorizon: '3months' | '6months' | '12months' = '6months'
  ) => {
    setLoading(prev => ({ ...prev, predictions: true }));
    setErrors(prev => ({ ...prev, predictions: null }));

    try {
      console.log('🔮 Generating predictive analysis for:', { careerPath, location, timeHorizon });
      
      // Use the enhanced demand forecaster for predictions
      const { data, error } = await supabase.functions.invoke('demand-forecaster', {
        body: {
          careerPath,
          location,
          timeHorizon,
          includeAdvanced: true,
          analysisDepth: 'comprehensive'
        }
      });

      if (error) throw error;

      // Transform forecast data into predictive analysis format
      const analysis: PredictiveAnalysis = {
        career_path: careerPath,
        location: location,
        predictions: {
          demand_forecast: {
            next_3_months: data?.demandProjection?.growthRate * 0.25 || 0,
            next_6_months: data?.demandProjection?.growthRate * 0.5 || 0,
            next_12_months: data?.demandProjection?.growthRate || 0,
            trend_direction: data?.demandProjection?.trend || 'stable',
            confidence: data?.demandProjection?.confidence || 0.5
          },
          salary_projection: {
            expected_change_3m: data?.salaryProjection?.expectedChange * 0.25 || 0,
            expected_change_6m: data?.salaryProjection?.expectedChange * 0.5 || 0,
            expected_change_12m: data?.salaryProjection?.expectedChange || 0,
            volatility_risk: data?.riskFactors?.length > 3 ? 'high' : data?.riskFactors?.length > 1 ? 'medium' : 'low',
            confidence: data?.salaryProjection?.confidence || 0.5
          },
          market_dynamics: {
            competition_trend: 'stable',
            skill_demand_shifts: [],
            emerging_opportunities: data?.opportunities || [],
            risk_factors: data?.riskFactors || []
          }
        },
        generated_at: new Date().toISOString(),
        accuracy_score: data?.confidence || 0.7
      };

      setPredictions(analysis);
      console.log('✅ Predictive analysis generated');
      
      return analysis;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate predictions';
      setErrors(prev => ({ ...prev, predictions: errorMsg }));
      console.error('❌ Prediction generation error:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, predictions: false }));
    }
  }, []);

  // Generate personalized recommendations
  const generatePersonalizedRecommendations = useCallback(async (
    userId: string,
    context: {
      careerPath: string;
      location: string;
      currentGoals?: string[];
      skillGaps?: string[];
      timeframe?: string;
    }
  ) => {
    setLoading(prev => ({ ...prev, recommendations: true }));
    setErrors(prev => ({ ...prev, recommendations: null }));

    try {
      console.log('🎯 Generating personalized recommendations for:', { userId, context });
      
      const { data, error } = await supabase.functions.invoke('personalized-market-insights', {
        body: {
          user_id: userId, // Use snake_case to match edge function expectation
          careerPath: context.careerPath,
          location: context.location,
          includeRecommendations: true,
          personalizationLevel: 'advanced'
        }
      });

      if (error) throw error;

      // Transform insights into structured recommendations
      const recs: PersonalizedRecommendation[] = (data?.recommendations || []).map((rec: any, index: number) => ({
        id: `rec_${Date.now()}_${index}`,
        type: rec.type || 'skill_development',
        title: rec.title || `Recommendation ${index + 1}`,
        description: rec.description || '',
        priority: rec.priority || 'medium',
        impact_score: rec.impact || 5,
        effort_required: rec.effort || 'medium',
        timeline: rec.timeline || '3-6 months',
        action_items: rec.actions || [],
        success_indicators: rec.indicators || [],
        related_data: rec.data || {}
      }));

      setRecommendations(recs);
      console.log('✅ Personalized recommendations generated:', recs.length);
      
      return recs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate recommendations';
      setErrors(prev => ({ ...prev, recommendations: errorMsg }));
      console.error('❌ Recommendation generation error:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, recommendations: false }));
    }
  }, []);

  // Calculate overall market health score
  const calculateOverallMarketHealth = useCallback(() => {
    if (!predictions) return 50; // Neutral score
    
    const demandHealth = predictions.predictions.demand_forecast.trend_direction === 'increasing' ? 80 : 
                        predictions.predictions.demand_forecast.trend_direction === 'stable' ? 60 : 40;
    
    const salaryHealth = predictions.predictions.salary_projection.expected_change_12m > 0 ? 70 : 
                        predictions.predictions.salary_projection.expected_change_12m === 0 ? 50 : 30;
    
    const riskHealth = predictions.predictions.market_dynamics.risk_factors.length < 2 ? 80 :
                      predictions.predictions.market_dynamics.risk_factors.length < 4 ? 60 : 40;
    
    return Math.round((demandHealth + salaryHealth + riskHealth) / 3);
  }, [predictions]);

  // Get AI-powered market insights summary
  const getInsightsSummary = useMemo(() => {
    const activePatterns = patterns.filter(p => !p.valid_until || new Date(p.valid_until) > new Date());
    const highConfidencePatterns = activePatterns.filter(p => p.confidence_score > 0.7);
    const criticalRecommendations = recommendations.filter(r => r.priority === 'high');
    
    return {
      totalPatterns: activePatterns.length,
      highConfidencePatterns: highConfidencePatterns.length,
      predictionsAvailable: !!predictions,
      predictionAccuracy: predictions?.accuracy_score || 0,
      totalRecommendations: recommendations.length,
      criticalRecommendations: criticalRecommendations.length,
      lastUpdated: patterns[0]?.detected_at || predictions?.generated_at || null,
      overallHealth: calculateOverallMarketHealth()
    };
  }, [patterns, predictions, recommendations, calculateOverallMarketHealth]);

  // Auto-refresh insights when context changes
  const refreshAllInsights = useCallback(async () => {
    if (!state.selectedCareerPath || !state.selectedLocation) return;
    
    const [patternsResult, predictionsResult] = await Promise.all([
      discoverMarketPatterns(state.selectedCareerPath, state.selectedLocation),
      generatePredictiveAnalysis(state.selectedCareerPath, state.selectedLocation)
    ]);

    // Generate personalized recommendations if user is authenticated
    if (state.user?.id) {
      await generatePersonalizedRecommendations(state.user.id, {
        careerPath: state.selectedCareerPath,
        location: state.selectedLocation,
        currentGoals: state.currentGoal ? [state.currentGoal] : []
      });
    }

    return {
      patterns: patternsResult,
      predictions: predictionsResult,
      recommendations: recommendations
    };
  }, [state.selectedCareerPath, state.selectedLocation, state.currentGoal, state.user?.id]);

  return {
    // Data
    patterns,
    predictions,
    recommendations,
    insightsSummary: getInsightsSummary,
    
    // Loading states
    loading,
    errors,
    
    // Actions
    discoverMarketPatterns,
    generatePredictiveAnalysis,
    generatePersonalizedRecommendations,
    refreshAllInsights,
    
    // Utilities
    isAnalysisReady: !loading.patterns && !loading.predictions,
    hasRecentInsights: !!getInsightsSummary.lastUpdated && 
                      new Date(getInsightsSummary.lastUpdated) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  };
}
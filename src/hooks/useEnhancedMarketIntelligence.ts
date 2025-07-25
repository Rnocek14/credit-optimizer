import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMarketIntelligence } from './useMarketIntelligence';

interface HistoricalTrend {
  id: string;
  market_trend_id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  recorded_at: string;
}

interface ForecastData {
  career_path: string;
  location: string;
  predicted_growth: number;
  confidence_score: number;
  time_horizon: string;
  factors: string[];
}

interface RealTimeJobData {
  source: string;
  job_count: number;
  average_salary: number;
  companies: string[];
  skills: string[];
  updated_at: string;
}

export const useEnhancedMarketIntelligence = () => {
  const baseHook = useMarketIntelligence();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get historical trends for a career/location combination
  const getHistoricalTrends = useCallback(async (careerPath: string, location: string, months: number = 12) => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error: fetchError } = await supabase
        .from('market_trends_history')
        .select('*')
        .eq('career_path', careerPath)
        .eq('location', location)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch historical trends: ${fetchError.message}`);
      }

      return data as HistoricalTrend[] || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch historical trends';
      setError(errorMsg);
      console.error('❌ Historical trends error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate demand forecast using AI
  const generateDemandForecast = useCallback(async (careerPath: string, location: string, timeHorizon: string = '12months') => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔮 Generating forecast for ${careerPath} in ${location} (${timeHorizon})`);

      const { data, error: forecastError } = await supabase.functions.invoke('demand-forecaster', {
        body: {
          careerPath,
          location,
          timeHorizon
        }
      });

      if (forecastError) {
        throw new Error(`Forecast generation failed: ${forecastError.message}`);
      }

      console.log('✅ Forecast generated:', data);
      return data as ForecastData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Forecast generation failed';
      setError(errorMsg);
      console.error('❌ Forecast error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real-time job market data
  const fetchRealTimeJobData = useCallback(async (careerPath: string, location: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📊 Fetching real-time job data for ${careerPath} in ${location}`);

      const { data, error: jobDataError } = await supabase.functions.invoke('job-market-aggregator', {
        body: {
          careerPath,
          location,
          sources: ['linkedin', 'indeed', 'glassdoor'] // Multiple data sources
        }
      });

      if (jobDataError) {
        throw new Error(`Real-time data fetch failed: ${jobDataError.message}`);
      }

      console.log('✅ Real-time job data fetched:', data);
      return data as RealTimeJobData[];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Real-time data fetch failed';
      setError(errorMsg);
      console.error('❌ Real-time job data error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get personalized market recommendations based on user profile
  const getPersonalizedRecommendations = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🎯 Getting personalized recommendations for user ${userId}`);

      const { data, error: recommendError } = await supabase.functions.invoke('personalized-market-insights', {
        body: {
          userId
        }
      });

      if (recommendError) {
        throw new Error(`Personalized recommendations failed: ${recommendError.message}`);
      }

      console.log('✅ Personalized recommendations generated:', data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Personalized recommendations failed';
      setError(errorMsg);
      console.error('❌ Personalized recommendations error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create market trend comparison
  const compareMarketTrends = useCallback(async (careerPaths: string[], location: string) => {
    setLoading(true);
    setError(null);

    try {
      const comparisons = await Promise.all(
        careerPaths.map(async (careerPath) => {
          const { data } = await supabase
            .from('market_trends')
            .select('*')
            .eq('career_path', careerPath)
            .eq('location', location)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            careerPath,
            data: data || null
          };
        })
      );

      return comparisons.filter(comp => comp.data !== null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Market comparison failed';
      setError(errorMsg);
      console.error('❌ Market comparison error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Save historical snapshot
  const saveHistoricalSnapshot = useCallback(async (trendId: string) => {
    try {
      // Get current trend data
      const { data: trendData } = await supabase
        .from('market_trends')
        .select('*')
        .eq('id', trendId)
        .single();

      if (!trendData) return;

      // Save to history table
      await supabase
        .from('market_trends_history')
        .insert({
          market_trend_id: trendData.id,
          career_path: trendData.career_path,
          location: trendData.location,
          job_postings_count: trendData.job_postings_count,
          average_salary: trendData.average_salary,
          growth_rate: trendData.growth_rate,
          demand_score: trendData.demand_score,
          competition_level: trendData.competition_level,
          data_source: trendData.data_source,
          time_period: trendData.time_period,
          raw_data: trendData.raw_data,
          ai_insights: trendData.ai_insights,
          recorded_at: new Date().toISOString()
        });

      console.log('✅ Historical snapshot saved for trend:', trendId);
    } catch (err) {
      console.error('❌ Failed to save historical snapshot:', err);
    }
  }, []);

  return {
    ...baseHook,
    loading: loading || baseHook.loading,
    error: error || baseHook.error,
    getHistoricalTrends,
    generateDemandForecast,
    fetchRealTimeJobData,
    getPersonalizedRecommendations,
    compareMarketTrends,
    saveHistoricalSnapshot,
    clearError: () => {
      setError(null);
      baseHook.clearError();
    }
  };
};
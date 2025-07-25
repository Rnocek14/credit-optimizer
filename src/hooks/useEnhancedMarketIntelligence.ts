import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketIntelligence } from "./useMarketIntelligence";

interface HistoricalTrend {
  id: string;
  career_path: string;
  location: string;
  recorded_at: string;
  growth_rate: number;
  demand_score: number;
  average_salary: number;
  job_postings_count: number;
  ai_insights: any;
}

interface ForecastData {
  demandProjection: {
    trend: string;
    growthRate: number;
    confidence: number;
  };
  salaryProjection: {
    expectedChange: number;
    confidence: number;
  };
  marketFactors: string[];
  riskFactors: string[];
  opportunities: string[];
  timelineEvents: Array<{
    month: number;
    event: string;
    impact: string;
  }>;
  recommendations: string;
  confidence: number;
}

interface RealTimeJobData {
  source: string;
  data: {
    jobCount: number;
    averageSalary: number;
    companies: string[];
    skills: string[];
    insights: string;
  };
  success: boolean;
}

export function useEnhancedMarketIntelligence() {
  const baseHook = useMarketIntelligence();
  const [loadingForecasts, setLoadingForecasts] = useState(false);
  const [loadingJobData, setLoadingJobData] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [jobDataError, setJobDataError] = useState<string | null>(null);

  const getHistoricalTrends = async (
    careerPath: string, 
    location: string, 
    months: number = 12
  ): Promise<HistoricalTrend[]> => {
    try {
      const { data, error } = await supabase
        .from('market_trends_history')
        .select('*')
        .eq('career_path', careerPath)
        .eq('location', location)
        .order('recorded_at', { ascending: false })
        .limit(months);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching historical trends:', error);
      return [];
    }
  };

  const generateDemandForecast = async (
    careerPath: string,
    location: string,
    timeHorizon: string = '6months'
  ): Promise<ForecastData | null> => {
    setLoadingForecasts(true);
    setForecastError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('demand-forecaster', {
        body: {
          careerPath,
          location,
          timeHorizon
        }
      });

      if (error) throw error;
      return data?.forecast || null;
    } catch (error) {
      console.error('Error generating demand forecast:', error);
      setForecastError(error instanceof Error ? error.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoadingForecasts(false);
    }
  };

  const fetchRealTimeJobData = async (
    careerPath: string,
    location: string
  ): Promise<RealTimeJobData[]> => {
    setLoadingJobData(true);
    setJobDataError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('job-market-aggregator', {
        body: {
          careerPath,
          location,
          sources: ['linkedin', 'indeed', 'glassdoor']
        }
      });

      if (error) throw error;
      return data?.data?.sources || [];
    } catch (error) {
      console.error('Error fetching real-time job data:', error);
      setJobDataError(error instanceof Error ? error.message : 'Unknown error occurred');
      return [];
    } finally {
      setLoadingJobData(false);
    }
  };

  const getPersonalizedRecommendations = async (userId: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('personalized-market-insights', {
        body: { userId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error);
      return null;
    }
  };

  const compareMarketTrends = async (
    careerPaths: string[],
    location: string
  ): Promise<{ careerPath: string; data: any | null }[]> => {
    const results = await Promise.all(
      careerPaths.map(async (careerPath) => {
        try {
          const { data, error } = await supabase.functions.invoke('market-trend-analyzer', {
            body: {
              careerPath,
              location,
              timeframe: '6months'
            }
          });

          if (error) throw error;
          return { careerPath, data: data?.marketTrends || null };
        } catch (error) {
          console.error(`Error analyzing trends for ${careerPath}:`, error);
          return { careerPath, data: null };
        }
      })
    );

    return results;
  };

  const saveHistoricalSnapshot = async (trendId: string): Promise<void> => {
    try {
      const { data: trend, error: trendError } = await supabase
        .from('market_trends')
        .select('*')
        .eq('id', trendId)
        .single();

      if (trendError) throw trendError;

      const { error: historyError } = await supabase
        .from('market_trends_history')
        .insert({
          market_trend_id: trend.id,
          career_path: trend.career_path,
          location: trend.location,
          job_postings_count: trend.job_postings_count,
          average_salary: trend.average_salary,
          growth_rate: trend.growth_rate,
          demand_score: trend.demand_score,
          competition_level: trend.competition_level,
          time_period: trend.time_period,
          data_source: trend.data_source,
          raw_data: trend.raw_data,
          ai_insights: trend.ai_insights,
          recorded_at: new Date().toISOString()
        });

      if (historyError) throw historyError;
    } catch (error) {
      console.error('Error saving historical snapshot:', error);
      throw error;
    }
  };

  return {
    ...baseHook,
    loadingForecasts,
    loadingJobData,
    forecastError,
    jobDataError,
    getHistoricalTrends,
    generateDemandForecast,
    fetchRealTimeJobData,
    getPersonalizedRecommendations,
    compareMarketTrends,
    saveHistoricalSnapshot,
  };
}
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchCareerPathTitle,
  fetchLocationDetails,
  fetchMarketTrendsRaw,
  fetchTopGrowingCareers as apiFetchTopGrowing,
  fetchSalaryInsightsRaw,
} from '@/shared/lib/api/marketIntelligence';

interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  data_source: string;
  time_period: string;
  raw_data: any;
  ai_insights: any;
  created_at: string;
  updated_at?: string;
}

interface MarketAnalysis {
  careerPath: string;
  location: string;
  timeframe: string;
  marketTrends: {
    averageGrowth: number;
    volatility: number;
    demandScore: number;
    competitionLevel: string;
    aiInsights: {
      demandTrend: 'increasing' | 'stable' | 'decreasing';
      salaryTrend: 'rising' | 'stable' | 'declining';
      growthRate: number;
      marketSaturation: 'low' | 'medium' | 'high';
      keyDrivers: string[];
      riskFactors: string[];
      recommendation: string;
      confidence: number;
    };
    relatedSkills: any[];
    lastUpdated: string;
  };
}

export const useMarketIntelligence = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketTrend[]>([]);

  const fetchMarketTrends = useCallback(async (careerPathId?: string, locationId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let careerPathTitle: string | undefined;
      let locationValue: string | undefined;
      let locationLabel: string | undefined;

      if (careerPathId) {
        const cp = await fetchCareerPathTitle(careerPathId);
        careerPathTitle = cp?.title;
      }

      if (locationId) {
        const loc = await fetchLocationDetails(locationId);
        locationValue = loc?.value;
        locationLabel = loc?.label;
      }

      const data = await fetchMarketTrendsRaw({
        careerPathTitle,
        locationValue,
        locationLabel,
      });

      setMarketData(data as MarketTrend[]);
      return data as MarketTrend[];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      console.error('❌ Market trends fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Edge function invocation — allowed exception per API_SEAMS.md
  const analyzeMarketTrends = useCallback(async (careerPathId: string, locationId: string, timeframe: string = '6months') => {
    setLoading(true);
    setError(null);

    try {
      const [cp, loc] = await Promise.all([
        fetchCareerPathTitle(careerPathId),
        fetchLocationDetails(locationId),
      ]);

      if (!cp || !loc) {
        throw new Error('Invalid career path or location selected');
      }

      const { data, error: analysisError } = await supabase.functions.invoke('market-trend-analyzer', {
        body: {
          careerPathId,
          locationId,
          careerPath: cp.title,
          location: loc.value,
          timeframe
        }
      });

      if (analysisError) {
        throw new Error(`Market analysis failed: ${analysisError.message}`);
      }

      return data as MarketAnalysis;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Market analysis failed';
      setError(errorMsg);
      console.error('❌ Market analysis error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTopGrowingCareers = useCallback(async (location?: string, limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      return await apiFetchTopGrowing(location, limit);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch top careers';
      setError(errorMsg);
      console.error('❌ Top careers fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getSalaryInsights = useCallback(async (careerPath: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSalaryInsightsRaw(careerPath);

      const salaries = data.map(d => d.average_salary).filter(s => s > 0);
      const avgSalary = salaries.length ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
      const medianSalary = salaries.length ? salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)] : 0;
      const topLocation = data[0] || null;

      return {
        careerPath,
        averageSalary: Math.round(avgSalary),
        medianSalary: Math.round(medianSalary),
        topPayingLocation: topLocation,
        locationData: data,
        sampleSize: salaries.length
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch salary insights';
      setError(errorMsg);
      console.error('❌ Salary insights error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    marketData,
    fetchMarketTrends,
    analyzeMarketTrends,
    getTopGrowingCareers,
    getSalaryInsights,
    clearError: () => setError(null)
  };
};

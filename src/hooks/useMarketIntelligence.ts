import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  updated_at: string;
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

  // Fetch market trends from database
  const fetchMarketTrends = useCallback(async (careerPathId?: string, locationId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('market_trends')
        .select(`
          *,
          career_paths!inner(id, title),
          locations!inner(id, label, value)
        `)
        .order('created_at', { ascending: false });

      if (careerPathId) {
        // First try UUID match, then fallback to string match for legacy data
        const { data: careerPath } = await supabase
          .from('career_paths')
          .select('title')
          .eq('id', careerPathId)
          .single();
        
        if (careerPath) {
          query = query.or(`career_path.eq.${careerPath.title},career_path.ilike.%${careerPath.title}%`);
        }
      }
      
      if (locationId) {
        // First try UUID match, then fallback to string match for legacy data
        const { data: location } = await supabase
          .from('locations')
          .select('value, label')
          .eq('id', locationId)
          .single();
        
        if (location) {
          query = query.or(`location.eq.${location.value},location.eq.${location.label},location.ilike.%${location.label}%`);
        }
      }

      const { data, error: fetchError } = await query.limit(50);

      if (fetchError) {
        throw new Error(`Failed to fetch market trends: ${fetchError.message}`);
      }

      setMarketData(data as MarketTrend[] || []);
      return data as MarketTrend[] || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      console.error('❌ Market trends fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get AI-powered market analysis
  const analyzeMarketTrends = useCallback(async (careerPathId: string, locationId: string, timeframe: string = '6months') => {
    setLoading(true);
    setError(null);

    try {
      // Get career path and location details
      const [careerPathResult, locationResult] = await Promise.all([
        supabase.from('career_paths').select('title').eq('id', careerPathId).single(),
        supabase.from('locations').select('value, label').eq('id', locationId).single()
      ]);

      if (careerPathResult.error || locationResult.error) {
        throw new Error('Invalid career path or location selected');
      }

      const careerPath = careerPathResult.data.title;
      const location = locationResult.data.value;

      console.log(`📊 Requesting market analysis for ${careerPath} in ${location}`);
      
      const { data, error: analysisError } = await supabase.functions.invoke('market-trend-analyzer', {
        body: {
          careerPathId,
          locationId,
          careerPath,
          location,
          timeframe
        }
      });

      if (analysisError) {
        throw new Error(`Market analysis failed: ${analysisError.message}`);
      }

      console.log('✅ Market analysis completed:', data);
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

  // Get top growing careers in a location
  const getTopGrowingCareers = useCallback(async (location?: string, limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('market_trends')
        .select('career_path, growth_rate, demand_score, average_salary, competition_level')
        .order('growth_rate', { ascending: false });

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      const { data, error: fetchError } = await query.limit(limit);

      if (fetchError) {
        throw new Error(`Failed to fetch top careers: ${fetchError.message}`);
      }

      return data || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch top careers';
      setError(errorMsg);
      console.error('❌ Top careers fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get salary insights for a career path
  const getSalaryInsights = useCallback(async (careerPath: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('market_trends')
        .select('location, average_salary, growth_rate, demand_score')
        .ilike('career_path', `%${careerPath}%`)
        .order('average_salary', { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch salary insights: ${fetchError.message}`);
      }

      // Calculate insights
      const salaries = (data || []).map(d => d.average_salary).filter(s => s > 0);
      const avgSalary = salaries.length ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
      const medianSalary = salaries.length ? salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)] : 0;
      const topLocation = data?.[0] || null;

      return {
        careerPath,
        averageSalary: Math.round(avgSalary),
        medianSalary: Math.round(medianSalary),
        topPayingLocation: topLocation,
        locationData: data || [],
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
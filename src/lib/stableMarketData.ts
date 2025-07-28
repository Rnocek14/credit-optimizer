// Cached stable market data with real database integration
// This ensures consistent behavior during testing and development
import { supabase } from '@/integrations/supabase/client';

export interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  ai_insights: any;
  created_at?: string;
}

// Cache for database queries to avoid repeated calls
const dataCache = new Map<string, { data: MarketTrend[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Deterministic random number generator using career path + location as seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) / 2147483648; // Normalize to 0-1
}

// Generate consistent values based on seed
function generateStableValue(seed: string, min: number, max: number): number {
  const random = seededRandom(seed);
  return Math.floor(random * (max - min + 1)) + min;
}

export function generateStableMarketData(
  careerPath?: string | null, 
  location?: string | null
): MarketTrend[] {
  const careerPaths = [
    'Software Engineer', 'Data Scientist', 'Product Manager', 
    'UX Designer', 'Marketing Manager', 'Sales Representative',
    'Financial Analyst', 'DevOps Engineer', 'Business Analyst'
  ];
  
  const locations = [
    'New York', 'San Francisco', 'Austin', 'Seattle', 
    'Boston', 'Chicago', 'Los Angeles', 'Denver'
  ];

  const data: MarketTrend[] = [];
  
  // Generate data for all combinations or filtered combinations
  const targetCareerPaths = careerPath ? [careerPath] : careerPaths;
  const targetLocations = location ? [location] : locations;

  targetCareerPaths.forEach(cp => {
    targetLocations.forEach(loc => {
      const seed = `${cp}_${loc}`;
      
      // Generate stable values using seed
      const jobPostings = generateStableValue(`${seed}_jobs`, 50, 500);
      const salary = generateStableValue(`${seed}_salary`, 60000, 150000);
      const growth = generateStableValue(`${seed}_growth`, -5, 25);
      const demand = generateStableValue(`${seed}_demand`, 1, 10);
      const competitionIndex = generateStableValue(`${seed}_comp`, 0, 2);
      
      const competitionLevels = ['low', 'medium', 'high'];
      
      data.push({
        id: `stable_${seed}`,
        career_path: cp,
        location: loc,
        job_postings_count: jobPostings,
        average_salary: salary,
        growth_rate: growth,
        demand_score: demand,
        competition_level: competitionLevels[competitionIndex],
        ai_insights: null,
        created_at: new Date().toISOString()
      });
    });
  });

  return data;
}

// Async function to get real database data with caching
export async function getCachedRealMarketData(
  selectedCareerPath?: string | null,
  selectedLocation?: string | null
): Promise<MarketTrend[]> {
  const key = `${selectedCareerPath || 'all'}-${selectedLocation || 'all'}`;
  const now = Date.now();
  
  // Check cache first
  if (dataCache.has(key)) {
    const cached = dataCache.get(key)!;
    if (now - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached market data for:', key);
      return cached.data;
    }
  }

  console.log('🔄 Fetching fresh market data from database for:', key);
  
  try {
    let query = supabase
      .from('market_trends')
      .select('*')
      .limit(20);

    // Add filters if selections are made
    if (selectedCareerPath) {
      query = query.or(`career_path.ilike.%${selectedCareerPath}%,career_path.ilike.%${selectedCareerPath.replace(/\s+/g, '%')}%`);
    }
    
    if (selectedLocation) {
      query = query.or(`location.ilike.%${selectedLocation}%,location.ilike.%${selectedLocation.replace(/\s+/g, '%')}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('📊 Database returned:', data?.length || 0, 'market trends');

    // Transform database data to match our interface
    const marketData: MarketTrend[] = (data || []).map(item => ({
      id: item.id || `${item.career_path}-${item.location}`,
      career_path: item.career_path,
      location: item.location,
      job_postings_count: item.job_postings_count || 0,
      average_salary: item.average_salary || 0,
      growth_rate: item.growth_rate || 0,
      demand_score: item.demand_score || 0,
      competition_level: item.competition_level || 'medium',
      ai_insights: item.ai_insights || {}
    }));

    // Cache the result
    dataCache.set(key, { data: marketData, timestamp: now });
    
    return marketData;
  } catch (error) {
    console.error('Error fetching market data:', error);
    // Fallback to mock data on error
    return generateStableMarketData(selectedCareerPath, selectedLocation);
  }
}

// Synchronous function that returns cached data or mock data immediately
export function getCachedStableMarketData(
  selectedCareerPath?: string | null,
  selectedLocation?: string | null
): MarketTrend[] {
  const key = `${selectedCareerPath || 'all'}-${selectedLocation || 'all'}`;
  
  // Check if we have recent cached data
  if (dataCache.has(key)) {
    const cached = dataCache.get(key)!;
    const now = Date.now();
    if (now - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached market data (sync) for:', key);
      return cached.data;
    }
  }

  // Trigger async fetch for next time (fire and forget)
  getCachedRealMarketData(selectedCareerPath, selectedLocation).catch(console.error);
  
  // Return mock data immediately for first load
  console.log('🎭 Using mock data while fetching real data for:', key);
  return generateStableMarketData(selectedCareerPath, selectedLocation);
}
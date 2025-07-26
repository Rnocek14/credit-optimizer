// Stable mock data generator that produces consistent results
interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  ai_insights: any;
  created_at: string;
}

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
  careerPath?: string, 
  location?: string
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

// Memoization cache for stable data
const dataCache = new Map<string, MarketTrend[]>();

export function getCachedStableMarketData(
  careerPath?: string, 
  location?: string
): MarketTrend[] {
  const cacheKey = `${careerPath || 'all'}_${location || 'all'}`;
  
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }
  
  const data = generateStableMarketData(careerPath, location);
  dataCache.set(cacheKey, data);
  return data;
}
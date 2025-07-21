
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  id: string;
  value: string;
  label: string;
  emoji: string;
  continent: string;
  country_code: string;
  coordinates: [number, number];
  salary_multiplier: number;
  cost_of_living: number;
  job_market: string;
  job_icon: string;
  visa_eligibility: Record<string, boolean>;
  active: boolean;
}

export interface ContinentBoundsData {
  continent: string;
  bounds: {
    center: [number, number];
    scale: number;
  };
}

export interface LocationMetrics {
  location_id: string;
  roi: number;
  col_adjusted_roi: number;
  lqi: number;
  job_market_score: number;
  visa_score: number;
}

/**
 * Fetch all active locations from Supabase
 */
export const fetchLocations = async (): Promise<LocationData[]> => {
  const { data, error } = await (supabase as any)
    .from('locations')
    .select('*')
    .eq('active', true)
    .order('label');
  
  if (error) {
    console.error('Error fetching locations:', error);
    throw new Error('Failed to fetch locations');
  }
  
  return data.map((location: any) => ({
    ...location,
    coordinates: location.coordinates as [number, number],
    visa_eligibility: location.visa_eligibility as Record<string, boolean>
  }));
};

/**
 * Fetch continent bounds for map auto-focusing
 */
export const fetchContinentBounds = async (): Promise<ContinentBoundsData[]> => {
  const { data, error } = await (supabase as any)
    .from('continent_bounds')
    .select('*');
  
  if (error) {
    console.error('Error fetching continent bounds:', error);
    return [];
  }
  
  return data.map((bound: any) => ({
    continent: bound.continent,
    bounds: bound.bounds as { center: [number, number]; scale: number }
  }));
};

/**
 * Fetch locations with optional filtering
 */
export const fetchFilteredLocations = async (filters: {
  continent?: string;
  visa_eligible_from?: string;
  job_market?: string;
}): Promise<LocationData[]> => {
  let query = (supabase as any)
    .from('locations')
    .select('*')
    .eq('active', true);
  
  if (filters.continent) {
    query = query.eq('continent', filters.continent);
  }
  
  if (filters.job_market) {
    query = query.eq('job_market', filters.job_market);
  }
  
  const { data, error } = await query.order('label');
  
  if (error) {
    console.error('Error fetching filtered locations:', error);
    throw new Error('Failed to fetch filtered locations');
  }
  
  let filteredData = data.map((location: any) => ({
    ...location,
    coordinates: location.coordinates as [number, number],
    visa_eligibility: location.visa_eligibility as Record<string, boolean>
  }));
  
  // Filter by visa eligibility if specified
  if (filters.visa_eligible_from) {
    filteredData = filteredData.filter(location => 
      location.visa_eligibility[filters.visa_eligible_from!] === true
    );
  }
  
  return filteredData;
};

/**
 * Calculate ROI metrics for a location given career path data
 */
export const calculateLocationROI = (
  location: LocationData,
  careerPathSalary: number,
  currentSalary: number = 45000,
  skillCount: number = 8,
  costPerSkill: number = 150
): LocationMetrics => {
  const totalCost = skillCount * costPerSkill;
  const adjustedSalary = Math.round(careerPathSalary * location.salary_multiplier);
  const uplift = adjustedSalary - currentSalary;
  const roi = uplift / totalCost;
  const colAdjustedROI = uplift / (totalCost * location.cost_of_living);
  
  // Calculate LQI components
  const roiScore = roi;
  const colScore = 100 - (location.cost_of_living * 100);
  const jobMarketScore = location.job_market === 'High' ? 100 : 
                        location.job_market === 'Medium' ? 65 : 30;
  const visaScore = 100; // Default, would need user context for actual calculation
  
  // LQI formula: (ROI × 0.4) + (COL Score × 0.25) + (Job Market Score × 0.25) + (Visa Score × 0.10)
  const lqi = (roiScore * 0.4) + (colScore * 0.25) + (jobMarketScore * 0.25) + (visaScore * 0.10);
  
  return {
    location_id: location.id,
    roi,
    col_adjusted_roi: colAdjustedROI,
    lqi,
    job_market_score: jobMarketScore,
    visa_score: visaScore
  };
};

/**
 * Get unique values for filter dropdowns
 */
export const getFilterOptions = async () => {
  const locations = await fetchLocations();
  
  return {
    continents: [...new Set(locations.map(l => l.continent))].sort(),
    job_markets: [...new Set(locations.map(l => l.job_market))].sort(),
    countries: [...new Set(locations.map(l => l.country_code))].sort()
  };
};

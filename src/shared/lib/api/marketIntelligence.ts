/**
 * API module for Market Intelligence data.
 * Wraps market_trends, career_paths, and locations queries.
 */
import { supabase } from './client';

export async function fetchCareerPathTitle(careerPathId: string) {
  const { data, error } = await supabase
    .from('career_paths')
    .select('title')
    .eq('id', careerPathId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch all career paths for browsing (Discover hub). */
export async function fetchCareerPaths() {
  const { data, error } = await supabase
    .from('career_paths')
    .select('id, title, summary, industry, average_salary, growth_outlook, key_skills, level')
    .order('title');

  if (error) throw error;
  return data ?? [];
}

export async function fetchLocationDetails(locationId: string) {
  const { data, error } = await supabase
    .from('locations')
    .select('value, label')
    .eq('id', locationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchMarketTrendsRaw(filters?: {
  careerPathTitle?: string;
  locationValue?: string;
  locationLabel?: string;
  limit?: number;
}) {
  let query = supabase
    .from('market_trends')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.careerPathTitle) {
    query = query.or(
      `career_path.eq.${filters.careerPathTitle},career_path.ilike.%${filters.careerPathTitle}%`
    );
  }

  if (filters?.locationValue && filters?.locationLabel) {
    query = query.or(
      `location.eq.${filters.locationValue},location.eq.${filters.locationLabel},location.ilike.%${filters.locationLabel}%`
    );
  }

  const { data, error } = await query.limit(filters?.limit ?? 100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTopGrowingCareers(location?: string, limit = 10) {
  let query = supabase
    .from('market_trends')
    .select('career_path, growth_rate, demand_score, average_salary, competition_level')
    .order('growth_rate', { ascending: false });

  if (location) {
    query = query.ilike('location', `%${location}%`);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSalaryInsightsRaw(careerPath: string) {
  const { data, error } = await supabase
    .from('market_trends')
    .select('location, average_salary, growth_rate, demand_score')
    .ilike('career_path', `%${careerPath}%`)
    .order('average_salary', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

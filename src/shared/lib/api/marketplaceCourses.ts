import { supabase } from './client';
import type { MarketplaceOptionLite } from '@/shared/types/domain/marketplace';
import type { MarketplaceCourseForIntelligence } from '@/shared/lib/intelligence/mappers/courseToCandidate';

export type { MarketplaceOptionLite };

export async function fetchMarketplaceCoursesByTransferRules(
  acceptedCodes: string[]
): Promise<MarketplaceOptionLite[]> {
  if (!acceptedCodes.length) return [];

  const { data: courses, error } = await supabase
    .from('marketplace_courses')
    .select(`
      id, code, title, credits, level, cost_usd, duration_weeks, cri_score,
      providers:provider_id ( provider_code, type )
    `);

  if (error) throw error;
  if (!courses?.length) return [];

  type CourseWithProvider = (typeof courses)[number] & {
    providers: { provider_code: string; type: string } | null;
  };

  const matching = (courses as CourseWithProvider[]).filter(c =>
    acceptedCodes.includes(c.code)
  );

  return matching.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
    credits: c.credits,
    cost_usd: c.cost_usd,
    duration_weeks: c.duration_weeks,
    cri_score: c.cri_score ?? 0,
    providerCode: c.providers?.provider_code ?? null,
    providerType: c.providers?.type ?? null,
    level: c.level ?? 100,
  }));
}

/**
 * Fetch active marketplace courses as intelligence-ready shapes.
 * Filters to courses whose skill_tags overlap with the user's skill gaps.
 * Bounded to MAX_CANDIDATES to prevent scoring bloat.
 */
const MAX_CANDIDATES = 50;

export async function fetchMarketplaceCoursesForIntelligence(
  gapSkills: string[],
): Promise<MarketplaceCourseForIntelligence[]> {
  const { data, error } = await supabase
    .from('marketplace_courses')
    .select(`
      id, code, title, description, skill_tags, duration_weeks,
      cri_score, instructor_rating, completion_rate, level,
      cost_usd, subject_area,
      provider_id,
      providers:provider_id ( provider_code )
    `)
    .eq('active', true);

  if (error) {
    console.error('[fetchMarketplaceCoursesForIntelligence]', error);
    return [];
  }
  if (!data?.length) return [];

  // Lowercase gap skills for matching
  const gapSet = new Set(gapSkills.map(s => s.toLowerCase()));

  type Row = (typeof data)[number] & {
    providers: { provider_code: string } | null;
  };

  // Pre-filter: keep courses whose skill_tags intersect with gap skills
  const filtered = (data as Row[])
    .filter(c =>
      gapSet.size === 0 || // if no gaps, return all (fallback)
      (c.skill_tags ?? []).some(t => gapSet.has(t.toLowerCase()))
    )
    .slice(0, MAX_CANDIDATES);

  return filtered.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    skill_tags: c.skill_tags,
    duration_weeks: c.duration_weeks,
    cri_score: c.cri_score,
    instructor_rating: c.instructor_rating,
    completion_rate: c.completion_rate,
    level: c.level,
    cost_usd: c.cost_usd,
    subject_area: c.subject_area,
    provider_code: c.providers?.provider_code ?? null,
    provider_id: c.provider_id ?? null,
  }));
}

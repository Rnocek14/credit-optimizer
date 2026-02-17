import { supabase } from './client';

export interface MarketplaceOptionLite {
  id: string;
  code: string;
  title: string;
  credits: number;
  cost_usd?: number | null;
  duration_weeks?: number | null;
  cri_score?: number | null;
  providerCode?: string | null;
  providerType?: string | null;
  level?: number | null;
}

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

  const matchingCourses = (courses as any[]).filter((c: any) =>
    acceptedCodes.includes(c.code)
  );

  return matchingCourses.map((c: any) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    credits: c.credits,
    cost_usd: c.cost_usd,
    duration_weeks: c.duration_weeks,
    cri_score: c.cri_score ?? 0,
    providerCode: c.providers?.provider_code,
    providerType: c.providers?.type,
    level: c.level ?? 100,
  }));
}

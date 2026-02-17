import { supabase } from './client';
import type { MarketplaceOptionLite } from '@/shared/types/domain/marketplace';

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

  // Filter to matching codes and map to lite shape
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

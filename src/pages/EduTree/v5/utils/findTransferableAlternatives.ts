import { fetchAcceptedTransferSources, fetchMarketplaceCoursesByTransferRules } from '@/shared/lib/api';
import type { MarketplaceOptionLite } from '@/shared/lib/api';

export type { MarketplaceOptionLite };

export async function findTransferableAlternatives(opts: {
  requirementId?: string;
  targetSchool: string;
}): Promise<MarketplaceOptionLite[]> {
  const rules = await fetchAcceptedTransferSources({
    targetInstitutionNorm: opts.targetSchool.toUpperCase(),
  });

  if (!rules.length) return [];

  const codes = rules.map(r => r.source_course_code).filter(Boolean);
  if (!codes.length) return [];

  const list = await fetchMarketplaceCoursesByTransferRules(codes);

  // Rank: high CRI → low cost → low duration
  return list.sort((a, b) =>
    (b.cri_score ?? 0) - (a.cri_score ?? 0) ||
    (a.cost_usd ?? 9e9) - (b.cost_usd ?? 9e9) ||
    (a.duration_weeks ?? 9e9) - (b.duration_weeks ?? 9e9)
  ).slice(0, 5);
}

import type { RecommendationCandidate, ScorerResult } from '@/shared/types/intelligence';
import { clamp01, normalize } from '@/shared/lib/intelligence/normalize';

export function marketScorer(
  candidate: RecommendationCandidate,
): ScorerResult {
  const demand = clamp01(candidate.marketDemandScore ?? 0);
  const growth = normalize(candidate.marketGrowthRate ?? 0, -1, 1);

  const score = clamp01(demand * 0.7 + growth * 0.3);

  return {
    rawScore: score,
    explanation: score > 0.7 ? 'High demand / growth alignment' : 'Moderate market alignment',
  };
}

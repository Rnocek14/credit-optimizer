import type { RecommendationCandidate, ScorerResult, UserIntelligenceContext } from '@/shared/types/intelligence';
import { clamp01 } from '@/shared/lib/intelligence/normalize';

export function criScorer(
  candidate: RecommendationCandidate,
  ctx: UserIntelligenceContext,
): ScorerResult {
  const v = clamp01(candidate.criContribution ?? 0);

  if (!ctx.cri) {
    return { rawScore: 0, explanation: 'CRI unavailable' };
  }

  if (ctx.cri.gap <= 0) {
    return { rawScore: v * 0.3, explanation: 'CRI target met; reduced weighting' };
  }

  return {
    rawScore: v,
    explanation: v > 0.6 ? 'Strong CRI gap closure' : 'Moderate CRI impact',
  };
}

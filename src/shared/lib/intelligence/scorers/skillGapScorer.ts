import type { RecommendationCandidate, ScorerResult, UserIntelligenceContext } from '@/shared/types/intelligence';
import { clamp01, normalize } from '@/shared/lib/intelligence/normalize';
import { PRIORITY_SCORE } from '@/shared/lib/intelligence/constants';

export function skillGapScorer(
  candidate: RecommendationCandidate,
  ctx: UserIntelligenceContext,
): ScorerResult {
  const tags = new Set((candidate.skillTags ?? []).map((s) => s.toLowerCase()));
  if (!tags.size || !ctx.skillGaps?.length) {
    return { rawScore: 0.1, explanation: 'No gap/tag match data' };
  }

  const matched = ctx.skillGaps.filter(
    (g) => g.skill && tags.has(g.skill.toLowerCase()),
  );

  if (!matched.length) {
    return { rawScore: 0.15, explanation: 'Does not directly target a top gap' };
  }

  const bestPriority = matched.reduce(
    (acc, g) => Math.max(acc, PRIORITY_SCORE[g.priority] ?? 1),
    1,
  );

  const score = clamp01(normalize(bestPriority, 1, 4));

  return {
    rawScore: score,
    explanation: score > 0.7 ? 'Targets a critical skill gap' : 'Targets a meaningful skill gap',
  };
}

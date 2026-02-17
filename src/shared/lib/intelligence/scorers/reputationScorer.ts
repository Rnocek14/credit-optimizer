import type { RecommendationCandidate, ScorerResult } from '@/shared/types/intelligence';
import { clamp01, normalize } from '@/shared/lib/intelligence/normalize';

export function reputationScorer(candidate: RecommendationCandidate): ScorerResult {
  const trust = clamp01(candidate.platformTrust ?? 1);
  const rep = normalize(candidate.instructorReputation ?? 5, 0, 5);
  const score = clamp01(trust * 0.6 + rep * 0.4);

  return {
    rawScore: score,
    explanation: score > 0.7 ? 'High trust / instructor reputation' : 'Neutral trust weighting',
  };
}

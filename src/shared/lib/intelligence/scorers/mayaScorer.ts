import type { RecommendationCandidate, ScorerResult } from '@/shared/types/intelligence';
import { clamp01 } from '@/shared/lib/intelligence/normalize';

export function mayaScorer(candidate: RecommendationCandidate): ScorerResult {
  const conf = clamp01(candidate.mayaConfidence ?? 0);

  if (!conf) return { rawScore: 0, explanation: 'No Maya boost' };

  return {
    rawScore: conf,
    explanation: candidate.mayaExplanation ?? 'Maya personalization boost',
  };
}

/**
 * Intelligence Layer — Constants
 */

import type { ScoringWeights, PriorityScoreMap } from '@/shared/types/intelligence';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  cri: 0.35,
  market: 0.25,
  skillGap: 0.25,
  maya: 0.10,
  reputation: 0.05,
};

export const PRIORITY_SCORE: PriorityScoreMap = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

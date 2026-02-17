import type { ScorerPlugin } from './types';
import type { ScoringWeights } from '@/shared/types/intelligence';
import { criScorer } from './criScorer';
import { marketScorer } from './marketScorer';
import { skillGapScorer } from './skillGapScorer';
import { mayaScorer } from './mayaScorer';
import { reputationScorer } from './reputationScorer';

export function buildDefaultScorers(weights: ScoringWeights): ScorerPlugin[] {
  const sum = weights.cri + weights.market + weights.skillGap + weights.maya + weights.reputation;

  // If all weights are zero/negative, fall back to equal distribution.
  if (sum <= 0) {
    const eq = 1 / 5;
    return [
      { name: 'cri', weight: eq, score: criScorer },
      { name: 'market', weight: eq, score: (c) => marketScorer(c) },
      { name: 'skillGap', weight: eq, score: skillGapScorer },
      { name: 'maya', weight: eq, score: (c) => mayaScorer(c) },
      { name: 'reputation', weight: eq, score: (c) => reputationScorer(c) },
    ];
  }

  return [
    { name: 'cri', weight: weights.cri / sum, score: criScorer },
    { name: 'market', weight: weights.market / sum, score: (c) => marketScorer(c) },
    { name: 'skillGap', weight: weights.skillGap / sum, score: skillGapScorer },
    { name: 'maya', weight: weights.maya / sum, score: (c) => mayaScorer(c) },
    { name: 'reputation', weight: weights.reputation / sum, score: (c) => reputationScorer(c) },
  ];
}

export type { ScorerPlugin } from './types';

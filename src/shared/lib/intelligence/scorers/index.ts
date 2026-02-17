import type { ScorerPlugin } from './types';
import type { ScoringWeights } from '@/shared/types/intelligence';
import { criScorer } from './criScorer';
import { marketScorer } from './marketScorer';
import { skillGapScorer } from './skillGapScorer';
import { mayaScorer } from './mayaScorer';
import { reputationScorer } from './reputationScorer';

export function buildDefaultScorers(weights: ScoringWeights): ScorerPlugin[] {
  return [
    { name: 'cri', weight: weights.cri, score: criScorer },
    { name: 'market', weight: weights.market, score: (c) => marketScorer(c) },
    { name: 'skillGap', weight: weights.skillGap, score: skillGapScorer },
    { name: 'maya', weight: weights.maya, score: (c) => mayaScorer(c) },
    { name: 'reputation', weight: weights.reputation, score: (c) => reputationScorer(c) },
  ];
}

export type { ScorerPlugin } from './types';

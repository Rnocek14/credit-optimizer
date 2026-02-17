import type { ScorerPlugin } from './types';
import type { ScoringWeights } from '@/shared/types/intelligence';
import { criScorer } from './criScorer';
import { marketScorer } from './marketScorer';
import { skillGapScorer } from './skillGapScorer';
import { mayaScorer } from './mayaScorer';
import { reputationScorer } from './reputationScorer';

export function buildDefaultScorers(weights: ScoringWeights): ScorerPlugin[] {
  // Guard against weight drift: normalize so weights always sum to 1.
  const raw = weights;
  const sum = raw.cri + raw.market + raw.skillGap + raw.maya + raw.reputation;
  const d = sum > 0 ? sum : 1; // fallback: treat as equal if all zero

  return [
    { name: 'cri', weight: raw.cri / d, score: criScorer },
    { name: 'market', weight: raw.market / d, score: (c) => marketScorer(c) },
    { name: 'skillGap', weight: raw.skillGap / d, score: skillGapScorer },
    { name: 'maya', weight: raw.maya / d, score: (c) => mayaScorer(c) },
    { name: 'reputation', weight: raw.reputation / d, score: (c) => reputationScorer(c) },
  ];
}

export type { ScorerPlugin } from './types';

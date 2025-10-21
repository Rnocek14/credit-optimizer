import type { ScoringWeights } from '../types/exports';

/**
 * Maps UI weights {cost, time, quality} to engine weights {cost, time, cri}.
 * UI uses "quality" for user-facing clarity; engine uses "cri" (Credit Recognition Index).
 */
export const mapWeightsForEngine = (
  uiWeights: { cost: number; time: number; quality: number }
): ScoringWeights => ({
  cost: uiWeights.cost,
  time: uiWeights.time,
  cri: uiWeights.quality, // Map quality → cri
});

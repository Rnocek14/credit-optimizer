/**
 * Weight normalization utility
 * Converts between engine weights (cri) and scoring weights (quality)
 */

export const normalizeWeights = (
  w: { cost: number; time: number; cri?: number; quality?: number }
) => ({
  cost: w.cost,
  time: w.time,
  quality: w.quality ?? w.cri ?? 0,
});

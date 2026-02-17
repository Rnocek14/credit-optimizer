/**
 * Intelligence Layer — Normalization Utilities
 *
 * All scorers MUST use clamp01 on their output.
 * Use normalize() to map arbitrary ranges to 0–1.
 */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const normalize = (v: number, min: number, max: number): number => {
  const denom = max - min || 1;
  return clamp01((v - min) / denom);
};

export const safeNumber = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/**
 * Statistical significance calculations for A/B testing
 * Implements two-proportion z-test and Wilson confidence intervals
 */

export interface ProportionTestResult {
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  sampleSizeAdequate: boolean;
  minSampleSize: number;
}

/**
 * Two-proportion z-test
 * Tests if conversion rate in bucket B is significantly different from bucket A
 * 
 * @param conversionsA - Number of conversions in bucket A
 * @param totalA - Total observations in bucket A
 * @param conversionsB - Number of conversions in bucket B
 * @param totalB - Total observations in bucket B
 * @param alpha - Significance level (default 0.05 for 95% confidence)
 */
export function twoProportionZTest(
  conversionsA: number,
  totalA: number,
  conversionsB: number,
  totalB: number,
  alpha: number = 0.05
): ProportionTestResult {
  const minSampleSize = 200; // Minimum samples per bucket for reliable test
  const sampleSizeAdequate = totalA >= minSampleSize && totalB >= minSampleSize;

  // Calculate proportions
  const pA = totalA > 0 ? conversionsA / totalA : 0;
  const pB = totalB > 0 ? conversionsB / totalB : 0;

  // Pooled proportion
  const pooled = (conversionsA + conversionsB) / (totalA + totalB);

  // Standard error
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / totalA + 1 / totalB));

  // Z-score (avoid division by zero)
  const zScore = se > 0 ? (pB - pA) / se : 0;

  // Two-tailed p-value using standard normal distribution
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Is result statistically significant?
  const isSignificant = sampleSizeAdequate && pValue < alpha;

  // Wilson confidence interval for the difference
  const ci = wilsonConfidenceInterval(pB - pA, totalB, alpha);

  return {
    zScore,
    pValue,
    isSignificant,
    confidenceInterval: ci,
    sampleSizeAdequate,
    minSampleSize
  };
}

/**
 * Wilson score confidence interval
 * More accurate than normal approximation, especially for small samples
 */
function wilsonConfidenceInterval(
  proportion: number,
  n: number,
  alpha: number = 0.05
): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 0 };

  const z = 1.96; // 95% confidence (alpha = 0.05)
  const p = Math.max(0, Math.min(1, proportion)); // Clamp to [0, 1]

  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) / n) + (z * z) / (4 * n * n))) / denominator;

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin)
  };
}

/**
 * Cumulative distribution function for standard normal distribution
 * Approximation using error function
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation (Abramowitz and Stegun)
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Calculate minimum detectable effect size
 * Given sample sizes, what's the smallest lift we can reliably detect?
 */
export function minimumDetectableEffect(
  totalA: number,
  totalB: number,
  baselineRate: number,
  alpha: number = 0.05,
  power: number = 0.8
): number {
  if (totalA === 0 || totalB === 0) return 0;

  const zA = 1.96; // alpha = 0.05 (two-tailed)
  const zB = 0.84; // power = 0.8

  const p0 = baselineRate;
  const n = (totalA + totalB) / 2; // Average sample size

  // Simplified MDE calculation
  const mde = (zA + zB) * Math.sqrt(2 * p0 * (1 - p0) / n);

  return mde;
}

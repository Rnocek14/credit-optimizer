export type ProviderType = 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null | undefined;

export interface ScoringWeights {
  cost: number;    // 0–1
  time: number;    // 0–1
  quality: number; // 0–1 (includes CRI)
}

export interface ScoreBreakdown {
  cost: number;    // 0–100
  time: number;    // 0–100
  quality: number; // 0–100
  cri: number;     // 0–100 (Credit Recognition Index)
  total: number;   // 0–100 (weighted)
}

export interface ScoringOption {
  cost_usd: number | null;
  duration_weeks: number | null;
  providerType?: ProviderType;
  // Optional CRI signals (graceful degradation if missing)
  aceNccrs?: boolean;
  proctored?: boolean;
  providerRep?: number; // override quality prior (0-100)
}

// Helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function minmaxNormalize(
  value: number | null,
  min: number,
  max: number,
  lowerIsBetter = true
): number {
  if (value == null || Number.isNaN(value)) return 0.5; // neutral when unknown
  if (max <= min) return 0.5; // all equal → neutral, not perfect
  const x = clamp01((value - min) / (max - min));
  return lowerIsBetter ? 1 - x : x;
}

// CRI v0: Rule-based Credit Recognition Index
function calculateCRI(option: ScoringOption): number {
  let score = 0;
  
  // Provider type prior (35%)
  const providerScore = (() => {
    switch (option.providerType) {
      case 'university': return 90;
      case 'testing_center': return 80;
      case 'mooc': return 65;
      case 'bootcamp': return 55;
      default: return 50;
    }
  })();
  score += providerScore * 0.35;
  
  // ACE/NCCRS evaluation (30%)
  if (option.aceNccrs) {
    score += 100 * 0.30;
  } else {
    score += 40 * 0.30; // Assume some can still transfer
  }
  
  // Assessment rigor (20%) - proctored courses transfer better
  if (option.proctored) {
    score += 85 * 0.20;
  } else {
    score += 50 * 0.20; // Self-paced can still work
  }
  
  // Placeholder for future: syllabus match (15%), not used yet
  score += 60 * 0.15;
  
  return Math.round(score);
}

// Quality combines provider reputation + CRI
function calculateQuality(option: ScoringOption): number {
  const cri = calculateCRI(option);
  
  // Use explicit providerRep if provided, otherwise use defaults
  const providerRep = option.providerRep ?? (() => {
    switch (option.providerType) {
      case 'university': return 90;
      case 'testing_center': return 80;
      case 'mooc': return 75;
      case 'bootcamp': return 70;
      default: return 60;
    }
  })();
  
  return Math.round(cri * 0.7 + providerRep * 0.3);
}

export function calculateOptionScore(
  option: ScoringOption,
  allOptions: ScoringOption[],
  weights: ScoringWeights = { cost: 0.4, time: 0.3, quality: 0.3 }
): ScoreBreakdown {
  // Null safety: explicit null checks (Number(null) returns 0, not null)
  const safeCost = option.cost_usd === null ? null : Number(option.cost_usd);
  const safeDuration = option.duration_weeks === null ? null : Number(option.duration_weeks);
  
  // Extract ranges for normalization
  const costs = allOptions
    .map(o => Number(o.cost_usd))
    .filter((v): v is number => v != null && !Number.isNaN(v));
  const durs = allOptions
    .map(o => Number(o.duration_weeks))
    .filter((v): v is number => v != null && !Number.isNaN(v));
  
  const minCost = costs.length ? Math.min(...costs) : 0;
  const maxCost = costs.length ? Math.max(...costs) : 1;
  const minDur = durs.length ? Math.min(...durs) : 0;
  const maxDur = durs.length ? Math.max(...durs) : 1;
  
  // Normalize dimensions (0–1)
  const cost01 = safeCost === 0 
    ? 1 
    : minmaxNormalize(safeCost, minCost, maxCost, true);
  const time01 = minmaxNormalize(safeDuration, minDur, maxDur, true);
  const cri = calculateCRI(option);
  const quality = calculateQuality(option);
  
  // Convert to 0–100 for display
  const cost100 = Math.round(cost01 * 100);
  const time100 = Math.round(time01 * 100);
  const quality100 = quality; // Already 0-100
  
  // Weighted total
  const total = Math.round(
    cost01 * weights.cost * 100 +
    time01 * weights.time * 100 +
    (quality / 100) * weights.quality * 100
  );
  
  return {
    cost: cost100,
    time: time100,
    quality: quality100,
    cri,
    total
  };
}

/**
 * Generate a 1-line human-readable reason for why an option is recommended.
 * Used for "⭐ Recommended" badge tooltip/explanation.
 */
export function getRecommendedReason(
  option: ScoringOption, 
  breakdown: ScoreBreakdown
): string {
  const factors: string[] = [];
  
  // Top cost performer
  if (breakdown.cost >= 90) factors.push('Lowest cost');
  else if (breakdown.cost >= 75) factors.push('Budget-friendly');
  
  // Speed factor
  if (breakdown.time >= 90) factors.push('Fastest completion');
  else if (breakdown.time >= 75) factors.push('Quick turnaround');
  
  // Quality/CRI factor
  if (breakdown.cri >= 80) factors.push('High transfer confidence');
  else if (breakdown.cri >= 70 && option.aceNccrs) factors.push('ACE-recommended');
  
  // Proctored bonus
  if (option.proctored) factors.push('Proctored');
  
  // Provider trust
  if (option.providerType === 'university') factors.push('University credit');
  else if (option.providerType === 'testing_center') factors.push('Standardized exam');
  
  // Return top 2 factors for conciseness
  return factors.slice(0, 2).join(' + ') || 'Best overall match';
}

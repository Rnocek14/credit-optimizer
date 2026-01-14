import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';

/**
 * Minimum dollar savings required to show the savings banner.
 * Centralized so card + modal stay in sync.
 */
export const MIN_SAVINGS_TO_SHOW_BANNER = 500;

/**
 * Minimum weeks saved to show time-saved text.
 * Set to ~13 weeks (3 months) to suppress small rounding-artifact savings
 * on per-credit schools while showing meaningful savings like WGU's 6 months.
 */
export const MIN_WEEKS_TO_SHOW_TIME_SAVED = 13;

/**
 * Maximum months saved to display (safety cap against data bugs).
 * 36 months = 3 years is a reasonable upper bound for degree acceleration.
 */
export const MAX_MONTHS_SAVED_DISPLAY = 36;

/**
 * Represents the savings from using a multi-school strategy
 * vs completing the degree entirely at the anchor school
 */
export interface TemplateStrategySavings {
  templateId: string;
  anchorSchool: string;
  strategyName: string; // "Multi-School to WGU"
  
  // Costs
  optimizedCost: number;
  baselineCost: number;
  
  // Savings
  dollarSavings: number;
  percentSavings: number;
  
  // Time comparison
  optimizedWeeks: number;
  baselineWeeks: number;
  weeksSaved: number;
  
  // Edge case flags for UI guardrails
  isSlowerThanBaseline: boolean;
  isMoreExpensiveThanBaseline: boolean;
  
  // Provenance
  baselineSource: string;
  baselineNotes?: string;
}

/**
 * Calculate strategy savings for a template that has a single-school baseline
 */
export function calculateStrategySavings(
  template: MarketplaceDegreeTemplate
): TemplateStrategySavings | null {
  // Guard: no baseline data available - NEVER fabricate savings
  if (!template.singleSchoolBaseline) return null;
  
  const baseline = template.singleSchoolBaseline;
  
  // Guard: invalid baseline cost (0, negative, or unreasonably low) → treat as no baseline
  // A baseline under $1000 for a degree is clearly invalid data
  if (!baseline.costUsd || baseline.costUsd <= 1000) return null;
  
  const dollarSavings = baseline.costUsd - template.totals.costUsd;
  const rawWeeksSaved = baseline.weeks - template.totals.weeks;
  
  // Edge case flags for UI guardrails
  const isMoreExpensiveThanBaseline = dollarSavings < 0;
  const isSlowerThanBaseline = rawWeeksSaved < 0;
  
  // Guard: don't surface negative savings (multi-school costs more than baseline)
  // Still return object with flags so UI can handle gracefully
  if (isMoreExpensiveThanBaseline) return null;
  
  const percentSavings = Math.round((dollarSavings / baseline.costUsd) * 100);
  
  // Clamp weeksSaved to 0 minimum - never show negative time savings
  const weeksSaved = Math.max(0, rawWeeksSaved);
  
  return {
    templateId: template.id,
    anchorSchool: template.anchorSchool,
    strategyName: `Multi-School → ${template.anchorSchool}`,
    optimizedCost: template.totals.costUsd,
    baselineCost: baseline.costUsd,
    dollarSavings,
    percentSavings,
    optimizedWeeks: template.totals.weeks,
    baselineWeeks: baseline.weeks,
    weeksSaved,
    isSlowerThanBaseline,
    isMoreExpensiveThanBaseline,
    baselineSource: baseline.source,
    baselineNotes: baseline.notes,
  };
}

/**
 * Format savings as a readable string
 */
export function formatSavingsAmount(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Calculate time saved in months (capped to prevent data bug display issues)
 */
export function formatTimeSaved(weeks: number): string {
  const months = Math.round(weeks / 4.33);
  if (months === 0) return '';
  // Apply safety cap to prevent unrealistic claims from data bugs
  const cappedMonths = Math.min(months, MAX_MONTHS_SAVED_DISPLAY);
  return `${cappedMonths} month${cappedMonths !== 1 ? 's' : ''}`;
}

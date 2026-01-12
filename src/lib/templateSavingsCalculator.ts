import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';

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
  if (!template.singleSchoolBaseline) return null;
  
  const baseline = template.singleSchoolBaseline;
  const dollarSavings = baseline.costUsd - template.totals.costUsd;
  
  // Guard: don't surface negative savings (multi-school costs more than baseline)
  if (dollarSavings <= 0) return null;
  
  const percentSavings = baseline.costUsd > 0 
    ? Math.round((dollarSavings / baseline.costUsd) * 100) 
    : 0;
  const weeksSaved = baseline.weeks - template.totals.weeks;
  
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
 * Calculate time saved in months
 */
export function formatTimeSaved(weeks: number): string {
  const months = Math.round(weeks / 4.33);
  if (months === 0) return '';
  return `${months} month${months !== 1 ? 's' : ''}`;
}

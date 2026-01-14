/**
 * Two-Phase Timeline Computation
 * 
 * Separates degree timelines into:
 * 1. Alt-credit prep phase (user-paced, pre-enrollment)
 * 2. Enrollment phase (institutional, fixed pace)
 * 
 * This provides transparency about why alt-credit paths save money
 * without making exaggerated time-savings claims.
 */

import { isAltCreditOptimization, type Optimization } from '@/types/optimizationTypes';

export interface TwoPhaseBreakdown {
  /** Weeks for alt-credit prep (user-paced, before enrollment) */
  altCreditWeeks: number;
  /** Weeks for institutional enrollment (fixed pace) */
  enrollmentWeeks: number;
  /** Total weeks (altCreditWeeks + enrollmentWeeks) */
  totalWeeks: number;
  /** Credits completed via alt-credits */
  altCredits: number;
  /** Credits completed at institution */
  institutionalCredits: number;
  /** Whether this is an alt-credit optimized path */
  isAltCreditPath: boolean;
  /** Estimated alt-credit cost */
  altCreditCostUsd: number;
  /** Estimated institutional cost */
  institutionalCostUsd: number;
}

/**
 * Pace tier assumptions for alt-credit completion
 * These can be made configurable via UI later:
 * - Conservative: 6 weeks/course (busy adults, minimal study time)
 * - Typical: 4 weeks/course (current default, ~10 hrs/week)
 * - Aggressive: 2 weeks/course (dedicated learners, 20+ hrs/week)
 */
const ALT_CREDIT_WEEKS_PER_COURSE = 4; // "Typical" pace
const CREDITS_PER_ALT_COURSE = 3;

/**
 * Default assumptions for institutional pace
 * Standard: 15 credits per term, ~17 weeks per term
 */
const INSTITUTIONAL_CREDITS_PER_TERM = 15;
const INSTITUTIONAL_WEEKS_PER_TERM = 17;

/**
 * Compute two-phase breakdown from template data
 * 
 * @param templateData - The template_data JSON from database
 * @param optimization - The optimization type
 * @param fallbackWeeks - Fallback total weeks if data is missing
 */
export function computeTwoPhaseBreakdown(
  templateData: Record<string, unknown> | null,
  optimization: Optimization,
  fallbackWeeks: number
): TwoPhaseBreakdown {
  const isAltCreditPath = isAltCreditOptimization(optimization);
  
  // Extract data from template_data if available
  const altCredits = (templateData?.altCredits as number) || 0;
  const institutionalCredits = (templateData?.institutionalCredits as number) || 120;
  const altCostUsd = (templateData?.altCostUsd as number) || 0;
  const institutionalCostUsd = (templateData?.institutionalCostUsd as number) || 0;
  const storedPlanWeeks = (templateData?.planWeeks as number) || fallbackWeeks;
  
  if (!isAltCreditPath || altCredits === 0) {
    // Standard path: all time is enrollment time
    return {
      altCreditWeeks: 0,
      enrollmentWeeks: storedPlanWeeks,
      totalWeeks: storedPlanWeeks,
      altCredits: 0,
      institutionalCredits: institutionalCredits || 120,
      isAltCreditPath: false,
      altCreditCostUsd: 0,
      institutionalCostUsd: institutionalCostUsd,
    };
  }
  
  // Alt-credit path: compute both phases
  // Alt-credit phase: user-paced prep before enrollment
  const altCourses = Math.ceil(altCredits / CREDITS_PER_ALT_COURSE);
  const altCreditWeeks = altCourses * ALT_CREDIT_WEEKS_PER_COURSE;
  
  // Enrollment phase: fixed institutional pace
  // Use stored planWeeks as enrollment weeks (already computed by pricing model)
  // OR compute from institutional credits if planWeeks seems to include alt-credit time
  const enrollmentTerms = Math.ceil(institutionalCredits / INSTITUTIONAL_CREDITS_PER_TERM);
  const computedEnrollmentWeeks = enrollmentTerms * INSTITUTIONAL_WEEKS_PER_TERM;
  
  // Use the stored planWeeks as enrollment weeks (pricing model already accounts for reduced terms)
  const enrollmentWeeks = storedPlanWeeks;
  
  return {
    altCreditWeeks,
    enrollmentWeeks,
    totalWeeks: altCreditWeeks + enrollmentWeeks,
    altCredits,
    institutionalCredits,
    isAltCreditPath: true,
    altCreditCostUsd: altCostUsd,
    institutionalCostUsd: institutionalCostUsd,
  };
}

/**
 * Format weeks as months for display
 */
export function weeksToMonths(weeks: number): number {
  return Math.round(weeks / 4.33);
}

/**
 * Format a phase duration for display
 * Returns "X mo" for months, or "X wk" for short durations
 */
export function formatPhaseDuration(weeks: number): string {
  if (weeks === 0) return '—';
  if (weeks < 4) return `${weeks} wk`;
  const months = weeksToMonths(weeks);
  return months === 1 ? '1 mo' : `${months} mo`;
}

/**
 * Auto-heal layer for degree templates.
 * 
 * When a template is applied and produces policy violations,
 * this module detects fixable issues and either:
 * - Auto-corrects them (for fresh template applies)
 * - Reports what needs changing (for user-modified plans)
 * 
 * This is a GENERIC guardrail — not institution-specific.
 */

import type { BasketItem } from '@/pages/EduTree/v5/state/usePlanBasket';

export interface HealResult {
  healed: boolean;
  changes: HealChange[];
  remainingIssues: string[];
}

export interface HealChange {
  type: 'set_provider_code' | 'cap_transfer' | 'add_residency';
  description: string;
  courseId?: string;
  before?: string | number | null;
  after?: string | number | null;
}

/**
 * Validate basket items against basic institutional policy and fix providerCode gaps.
 * 
 * This catches the most common template data issues:
 * 1. Institutional courses missing providerCode (→ residency = 0)
 * 2. Transfer credits exceeding cap
 * 
 * Returns a HealResult describing what was changed.
 */
export function healBasketForPolicy(
  items: BasketItem[],
  anchorSchool: string,
  maxTransferCredits?: number
): HealResult {
  const changes: HealChange[] = [];
  const remainingIssues: string[] = [];

  // Fix 1: Institutional courses with missing or wrong providerCode
  for (const item of items) {
    if (
      item.providerType === 'university' &&
      (!item.providerCode || item.providerCode === 'UNKNOWN' || item.providerCode === 'Institution')
    ) {
      changes.push({
        type: 'set_provider_code',
        description: `Set ${item.courseId} providerCode to ${anchorSchool}`,
        courseId: item.courseId,
        before: item.providerCode,
        after: anchorSchool,
      });
      // Mutate in place — caller passes mutable items array
      (item as any).providerCode = anchorSchool;
    }
  }

  // Check 2: Transfer cap (report only, don't auto-remove courses)
  if (maxTransferCredits != null) {
    const transferCredits = items
      .filter(i => i.providerType !== 'university' || i.providerCode !== anchorSchool)
      .reduce((sum, i) => sum + i.credits, 0);
    
    if (transferCredits > maxTransferCredits) {
      remainingIssues.push(
        `Transfer credits (${transferCredits}) exceed ${maxTransferCredits}-credit cap by ${transferCredits - maxTransferCredits}cr`
      );
    }
  }

  return {
    healed: changes.length > 0,
    changes,
    remainingIssues,
  };
}

/**
 * Format heal result into a user-facing summary string.
 */
export function formatHealSummary(result: HealResult): string | null {
  if (!result.healed && result.remainingIssues.length === 0) return null;
  
  const parts: string[] = [];
  
  if (result.healed) {
    parts.push(`Adjusted ${result.changes.length} course(s) to meet institutional policy.`);
  }
  
  if (result.remainingIssues.length > 0) {
    parts.push(result.remainingIssues.join('; '));
  }
  
  return parts.join(' ');
}

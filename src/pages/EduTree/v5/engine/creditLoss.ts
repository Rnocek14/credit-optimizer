/**
 * Credit Loss Report - Explicit tracking of lost credits due to caps
 * Phase A: No silent rejection - all credit loss must be surfaced
 */

export interface CreditLossItem {
  courseId: string;
  optionId?: string;
  credits: number;
  reason: CreditLossReason;
  capType?: 'transfer' | 'alt' | 'provider' | 'community_college';
  capValue?: number;
  providerCode?: string;
}

export type CreditLossReason = 
  | 'cap_exceeded'
  | 'grade_too_low'
  | 'provider_not_approved'
  | 'duplicate'
  | 'not_applicable'
  | 'capstone_substitution'
  | 'cornerstone_substitution'
  | 'info_lit_substitution';

export interface CreditLossReport {
  /** Total credits incoming before any caps applied */
  totalIncoming: number;
  
  /** Credits successfully applied after caps */
  appliedCredits: number;
  
  /** Total credits lost due to caps/rejections */
  creditLoss: number;
  
  /** Breakdown of each lost credit item with reason */
  lostItems: CreditLossItem[];
  
  /** Summary by reason */
  lossByReason: Record<CreditLossReason, number>;
  
  /** Summary by cap type */
  lossByCap: {
    transfer: number;
    alt: number;
    provider: Record<string, number>;
  };
}

/**
 * Create an empty credit loss report
 */
export function createEmptyCreditLossReport(): CreditLossReport {
  return {
    totalIncoming: 0,
    appliedCredits: 0,
    creditLoss: 0,
    lostItems: [],
    lossByReason: {
      cap_exceeded: 0,
      grade_too_low: 0,
      provider_not_approved: 0,
      duplicate: 0,
      not_applicable: 0,
      capstone_substitution: 0,
      cornerstone_substitution: 0,
      info_lit_substitution: 0,
    },
    lossByCap: {
      transfer: 0,
      alt: 0,
      provider: {},
    },
  };
}

/**
 * Add a lost item to the report
 */
export function addLostItem(
  report: CreditLossReport,
  item: CreditLossItem
): CreditLossReport {
  const updated = { ...report };
  
  updated.lostItems = [...updated.lostItems, item];
  updated.creditLoss += item.credits;
  updated.lossByReason[item.reason] += item.credits;
  
  // Track by cap type
  if (item.capType === 'transfer') {
    updated.lossByCap.transfer += item.credits;
  } else if (item.capType === 'alt') {
    updated.lossByCap.alt += item.credits;
  } else if (item.capType === 'provider' && item.providerCode) {
    updated.lossByCap.provider[item.providerCode] = 
      (updated.lossByCap.provider[item.providerCode] ?? 0) + item.credits;
  }
  
  return updated;
}

/**
 * Calculate credit loss from cap exceedance
 * Returns items that should be rejected to bring total under cap
 */
export function calculateCapExceedance(
  items: Array<{ courseId: string; credits: number; providerCode?: string }>,
  currentTotal: number,
  cap: number,
  capType: 'transfer' | 'alt' | 'provider',
  providerCode?: string
): CreditLossItem[] {
  if (currentTotal <= cap) return [];
  
  const excess = currentTotal - cap;
  const lostItems: CreditLossItem[] = [];
  let remaining = excess;
  
  // Remove items from end first (LIFO - last added, first removed)
  const reversed = [...items].reverse();
  
  for (const item of reversed) {
    if (remaining <= 0) break;
    
    const lostCredits = Math.min(item.credits, remaining);
    lostItems.push({
      courseId: item.courseId,
      credits: lostCredits,
      reason: 'cap_exceeded',
      capType,
      capValue: cap,
      providerCode: providerCode ?? item.providerCode,
    });
    remaining -= lostCredits;
  }
  
  return lostItems;
}

/**
 * Format credit loss report for display/logging
 */
export function formatCreditLossReport(report: CreditLossReport): string {
  if (report.creditLoss === 0) {
    return `✓ No credit loss (${report.appliedCredits} credits applied)`;
  }
  
  const lines = [
    `⚠️ Credit Loss Report: ${report.creditLoss} credits lost`,
    `  Incoming: ${report.totalIncoming} | Applied: ${report.appliedCredits}`,
    '',
    'Lost by reason:',
  ];
  
  for (const [reason, credits] of Object.entries(report.lossByReason)) {
    if (credits > 0) {
      lines.push(`  - ${reason}: ${credits} credits`);
    }
  }
  
  if (report.lostItems.length > 0) {
    lines.push('', 'Lost items:');
    for (const item of report.lostItems.slice(0, 10)) {
      lines.push(`  - ${item.courseId}: ${item.credits}cr (${item.reason})`);
    }
    if (report.lostItems.length > 10) {
      lines.push(`  ... and ${report.lostItems.length - 10} more`);
    }
  }
  
  return lines.join('\n');
}

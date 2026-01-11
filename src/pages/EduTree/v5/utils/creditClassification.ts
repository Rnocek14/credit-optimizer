/**
 * Credit Classification Utilities
 * 
 * Single source of truth for classifying credits as:
 * - Resident (in-house at target institution)
 * - Transfer (from another institution)
 * - Alt Credit (ACE/NCCRS evaluated, MOOCs, testing centers)
 * 
 * IMPORTANT: All classification logic MUST flow through these functions.
 * Do not use raw providerType checks elsewhere.
 */

import type { ProviderType } from './optionScoring';
import { countsTowardAltCap } from './altCredit';

export interface ClassifiableItem {
  providerType?: ProviderType | string | null;
  providerCode?: string | null;
  isAltCredit?: boolean;
  aceNccrs?: boolean;
  credits: number;
  courseId?: string;
}

/**
 * Check if an item is a resident credit (in-house at target institution)
 */
export function isResidentCredit(item: ClassifiableItem, targetInstitutionCode: string): boolean {
  // Must be university type AND from the target institution
  if (item.providerType !== 'university') return false;
  if (!item.providerCode) return false;
  return item.providerCode.toUpperCase() === targetInstitutionCode.toUpperCase();
}

/**
 * Check if an item is a transfer credit (not from target institution)
 * Transfer = anything that isn't earned at the target school
 */
export function isTransferCredit(item: ClassifiableItem, targetInstitutionCode: string): boolean {
  // If it's a resident credit, it's NOT a transfer
  if (isResidentCredit(item, targetInstitutionCode)) return false;
  // Everything else is transfer (including alt credits)
  return true;
}

/**
 * Check if an item is an alt credit (counts toward noncollegiate cap)
 * Uses the canonical countsTowardAltCap function
 */
export function isAltCredit(item: ClassifiableItem): boolean {
  return countsTowardAltCap({
    isAltCredit: item.isAltCredit,
    aceNccrs: item.aceNccrs,
    providerType: item.providerType as ProviderType,
  });
}

/**
 * Calculate credit totals by classification
 */
export function calculateCreditTotals(
  items: ClassifiableItem[],
  targetInstitutionCode: string
): {
  total: number;
  resident: number;
  transfer: number;
  alt: number;
  byProvider: Record<string, number>;
} {
  const totals = {
    total: 0,
    resident: 0,
    transfer: 0,
    alt: 0,
    byProvider: {} as Record<string, number>,
  };

  for (const item of items) {
    totals.total += item.credits;

    if (isResidentCredit(item, targetInstitutionCode)) {
      totals.resident += item.credits;
    } else {
      totals.transfer += item.credits;
    }

    if (isAltCredit(item)) {
      totals.alt += item.credits;
    }

    const code = item.providerCode?.toUpperCase() || 'UNKNOWN';
    totals.byProvider[code] = (totals.byProvider[code] ?? 0) + item.credits;
  }

  return totals;
}

/**
 * Provider codes that are always considered alt credit
 * Used for explicit mapping when providerType is ambiguous
 */
export const ALT_CREDIT_PROVIDERS = new Set([
  'SOPHIA',
  'STUDYCOM',
  'STUDY_COM',
  'STUDY.COM',
  'STRAIGHTERLINE',
  'CLEP',
  'DSST',
  'AP',
  'IB',
  'TECEP',
  'UExcel',
  'UEXCEL',
  'ACE',
  'NCCRS',
  'MODERNSTATES',
  'SAYLOR',
  'COURSERA',
  'EDX',
  'UDEMY',
  'PLURALSIGHT',
]);

/**
 * Check if a provider code is a known alt credit provider
 */
export function isKnownAltProvider(providerCode: string | null | undefined): boolean {
  if (!providerCode) return false;
  return ALT_CREDIT_PROVIDERS.has(providerCode.toUpperCase());
}

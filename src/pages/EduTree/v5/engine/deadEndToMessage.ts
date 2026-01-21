/**
 * Dead-End to User Message Mapper
 * 
 * Translates DeadEndCheck reasons to user-friendly UI messages.
 * Uses patterns from existing invariant explainers for consistency.
 * 
 * DESIGN: This is a mapping layer, NOT a new code system.
 * DeadEndCheck.reasons are free-form strings from deadEndDetector.
 * We pattern-match to return structured UI content.
 */

import type { DeadEndCheck } from './deadEndDetector';

export interface DeadEndUIMessage {
  title: string;
  description: string;
  severity: 'error' | 'warning';
  /** Canonical invariant code if mappable, otherwise undefined */
  invariantCode?: string;
}

/**
 * Pattern matchers for dead-end reason strings
 * Order matters: first match wins
 */
const REASON_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  getDescription: (match: RegExpMatchArray, reason: string) => string;
  invariantCode?: string;
}> = [
  // Noncollegiate/Alt credit cap
  {
    pattern: /noncollegiate cap.*?(\d+)\/(\d+)/i,
    title: 'Alternative Credit Limit Exceeded',
    getDescription: (m) => `Would use ${m[1]} of ${m[2]} allowed alternative credits`,
    invariantCode: 'INV_ALT_CAP_EXCEEDED',
  },
  {
    pattern: /exceeding noncollegiate cap by (\d+)/i,
    title: 'Alternative Credit Limit Exceeded',
    getDescription: (m) => `Already over limit by ${m[1]} credits`,
    invariantCode: 'INV_ALT_CAP_EXCEEDED',
  },
  // Degree total
  {
    pattern: /exceeds degree total.*?(\d+)\/(\d+)/i,
    title: 'Degree Credit Maximum',
    getDescription: (m) => `Would have ${m[1]} credits (max ${m[2]})`,
    invariantCode: 'INV_TOTAL_CREDITS_MISMATCH',
  },
  // Residency
  {
    pattern: /cannot satisfy residency.*?need (\d+)/i,
    title: 'Residency Requirement at Risk',
    getDescription: (m) => `Need ${m[1]} more institutional credits but remaining slots can't provide them`,
    invariantCode: 'INV_RESIDENCY_NOT_MET',
  },
  {
    pattern: /insufficient room for residency.*?need (\d+)/i,
    title: 'Residency Requirement at Risk',
    getDescription: (m) => `Need ${m[1]} more institutional credits but not enough slots remain`,
    invariantCode: 'INV_RESIDENCY_NOT_MET',
  },
  // Upper-division
  {
    pattern: /cannot satisfy upper-division.*?need (\d+)/i,
    title: 'Upper-Division Requirement at Risk',
    getDescription: (m) => `Need ${m[1]} more 300+ level credits but remaining slots can't provide them`,
    invariantCode: 'INV_UPPER_DIVISION_NOT_MET',
  },
  // Credits insufficient
  {
    pattern: /insufficient remaining modules.*?need (\d+)/i,
    title: 'Degree Completion at Risk',
    getDescription: (m) => `Need ${m[1]} more credits but not enough slots remain`,
    invariantCode: 'INV_TOTAL_CREDITS_MISMATCH',
  },
];

/**
 * Fallback message when no pattern matches
 */
const FALLBACK_MESSAGE: DeadEndUIMessage = {
  title: 'Selection Blocked',
  description: 'This selection would make degree completion impossible',
  severity: 'error',
};

/**
 * Map a DeadEndCheck to a user-friendly UI message
 */
export function deadEndToUIMessage(check: DeadEndCheck): DeadEndUIMessage {
  if (!check.isDeadEnd || check.reasons.length === 0) {
    return FALLBACK_MESSAGE;
  }

  const primaryReason = check.reasons[0];

  for (const { pattern, title, getDescription, invariantCode } of REASON_PATTERNS) {
    const match = primaryReason.match(pattern);
    if (match) {
      return {
        title,
        description: getDescription(match, primaryReason),
        severity: 'error',
        invariantCode,
      };
    }
  }

  // No pattern matched - use raw reason
  return {
    title: 'Selection Blocked',
    description: primaryReason,
    severity: 'error',
  };
}

/**
 * Get all UI messages for a dead-end (for tooltip/details)
 */
export function getAllDeadEndMessages(check: DeadEndCheck): DeadEndUIMessage[] {
  if (!check.isDeadEnd) return [];

  return check.reasons.map(reason => {
    for (const { pattern, title, getDescription, invariantCode } of REASON_PATTERNS) {
      const match = reason.match(pattern);
      if (match) {
        return {
          title,
          description: getDescription(match, reason),
          severity: 'error' as const,
          invariantCode,
        };
      }
    }
    return {
      title: 'Validation Error',
      description: reason,
      severity: 'error' as const,
    };
  });
}

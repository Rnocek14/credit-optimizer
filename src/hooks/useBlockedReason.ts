/**
 * useBlockedReason Hook
 * 
 * React hook for resolving and displaying invariant explanations.
 * Provides audience-aware payloads for admin, marketplace, and public views.
 * 
 * SEVERITY SEMANTICS:
 * - 'hard': Blocking violations
 * - 'warn': Non-blocking warnings
 */

import { useMemo } from 'react';
import {
  type InvariantReport,
  type BlockedReasonPayload,
  type AnyViolation,
  type PrimaryBlocker,
  resolveBlockedReason,
} from '@/lib/invariant';
import type { AudienceLevel } from '@/lib/invariant';

interface UseBlockedReasonOptions {
  /**
   * Audience level for filtering violations
   * - admin: Full details, internal terminology
   * - marketplace: User-safe messaging
   * - public: Minimal, end-user safe
   */
  audience?: AudienceLevel;
}

interface UseBlockedReasonResult {
  /** Full payload with all audience versions */
  payload: BlockedReasonPayload | null;
  
  /** Is the template blocked (has hard failures)? */
  isBlocked: boolean;
  
  /** Has warnings but not blocked? */
  hasWarnings: boolean;
  
  /** Would fail under strict mode? */
  wouldFailStrict: boolean;
  
  /** Primary blocking reason for display (never null when blocked) */
  primaryBlocker: PrimaryBlocker | null;
  
  /** Filtered hard failures for current audience */
  hardFailures: AnyViolation[];
  
  /** Filtered warnings for current audience */
  warnings: AnyViolation[];
  
  /** Hard failure count for current audience */
  hardCount: number;
  
  /** Warning count for current audience */
  warnCount: number;
  
  /** Quick badge text for UI */
  badgeText: string | null;
}

/**
 * Hook for resolving and displaying blocked reasons
 * 
 * @param report - The invariant report from template validation
 * @param options - Configuration options including audience level
 * 
 * @example
 * ```tsx
 * const { isBlocked, primaryBlocker, hardFailures, warnings } = useBlockedReason(
 *   template.invariantReport,
 *   { audience: 'marketplace' }
 * );
 * 
 * if (isBlocked && primaryBlocker) {
 *   return <BlockedBanner title={primaryBlocker.title} />;
 * }
 * ```
 */
export function useBlockedReason(
  report: InvariantReport | null | undefined,
  options: UseBlockedReasonOptions = {}
): UseBlockedReasonResult {
  const { audience = 'admin' } = options;
  
  const result = useMemo<UseBlockedReasonResult>(() => {
    // Handle null/undefined report
    if (!report) {
      return {
        payload: null,
        isBlocked: false,
        hasWarnings: false,
        wouldFailStrict: false,
        primaryBlocker: null,
        hardFailures: [],
        warnings: [],
        hardCount: 0,
        warnCount: 0,
        badgeText: null,
      };
    }
    
    // Resolve the full payload
    const payload = resolveBlockedReason(report);
    
    // Get audience-filtered data
    let filteredData: {
      primaryBlocker: PrimaryBlocker | null;
      hardFailures: AnyViolation[];
      warnings: AnyViolation[];
      hardCount: number;
      warnCount: number;
    };
    
    switch (audience) {
      case 'marketplace':
        filteredData = {
          primaryBlocker: payload.marketplaceSafe.primaryBlocker,
          hardFailures: payload.marketplaceSafe.hardFailures,
          warnings: payload.marketplaceSafe.warnings,
          hardCount: payload.marketplaceSafe.hardCount,
          warnCount: payload.marketplaceSafe.warnCount,
        };
        break;
      case 'public':
        filteredData = {
          primaryBlocker: payload.publicSafe.primaryBlocker,
          hardFailures: payload.publicSafe.hardFailures,
          warnings: payload.publicSafe.warnings,
          hardCount: payload.publicSafe.hardCount,
          warnCount: payload.publicSafe.warnCount,
        };
        break;
      case 'admin':
      default:
        filteredData = {
          primaryBlocker: payload.primaryBlocker,
          hardFailures: payload.hardFailures,
          warnings: payload.warnings,
          hardCount: payload.hardCount,
          warnCount: payload.warnCount,
        };
        break;
    }
    
    // Generate badge text
    let badgeText: string | null = null;
    if (filteredData.hardCount > 0) {
      badgeText = filteredData.hardCount === 1 
        ? '1 issue' 
        : `${filteredData.hardCount} issues`;
    } else if (filteredData.warnCount > 0) {
      badgeText = filteredData.warnCount === 1 
        ? '1 warning' 
        : `${filteredData.warnCount} warnings`;
    }
    
    return {
      payload,
      isBlocked: payload.isBlocked,
      hasWarnings: payload.hasWarnings,
      wouldFailStrict: payload.wouldFailStrict,
      ...filteredData,
      badgeText,
    };
  }, [report, audience]);
  
  return result;
}

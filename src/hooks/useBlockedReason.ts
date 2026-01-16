/**
 * useBlockedReason Hook
 * 
 * React hook for resolving and displaying invariant explanations.
 * Provides audience-aware payloads for admin, marketplace, and public views.
 */

import { useMemo } from 'react';
import {
  type InvariantReport,
  type BlockedReasonPayload,
  type AudienceLevel,
  resolveBlockedReason,
} from '@/lib/invariant';

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
  
  /** Is the template blocked (has errors)? */
  isBlocked: boolean;
  
  /** Has warnings but not blocked? */
  hasWarnings: boolean;
  
  /** Would fail under strict mode? */
  wouldFailStrict: boolean;
  
  /** Primary blocking reason for display */
  primaryBlocker: BlockedReasonPayload['primaryBlocker'];
  
  /** Filtered errors for current audience */
  errors: BlockedReasonPayload['errors'];
  
  /** Filtered warnings for current audience */
  warnings: BlockedReasonPayload['warnings'];
  
  /** Error count for current audience */
  errorCount: number;
  
  /** Warning count for current audience */
  warningCount: number;
  
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
 * const { isBlocked, primaryBlocker, errors, warnings } = useBlockedReason(
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
        errors: [],
        warnings: [],
        errorCount: 0,
        warningCount: 0,
        badgeText: null,
      };
    }
    
    // Resolve the full payload
    const payload = resolveBlockedReason(report);
    
    // Get audience-filtered data
    let filteredData: {
      primaryBlocker: BlockedReasonPayload['primaryBlocker'];
      errors: BlockedReasonPayload['errors'];
      warnings: BlockedReasonPayload['warnings'];
      errorCount: number;
      warningCount: number;
    };
    
    switch (audience) {
      case 'marketplace':
        filteredData = {
          primaryBlocker: payload.marketplaceSafe.primaryBlocker,
          errors: payload.marketplaceSafe.errors,
          warnings: payload.marketplaceSafe.warnings,
          errorCount: payload.marketplaceSafe.errorCount,
          warningCount: payload.marketplaceSafe.warningCount,
        };
        break;
      case 'public':
        filteredData = {
          primaryBlocker: payload.publicSafe.primaryBlocker,
          errors: payload.publicSafe.errors,
          warnings: payload.publicSafe.warnings,
          errorCount: payload.publicSafe.errorCount,
          warningCount: payload.publicSafe.warningCount,
        };
        break;
      case 'admin':
      default:
        filteredData = {
          primaryBlocker: payload.primaryBlocker,
          errors: payload.errors,
          warnings: payload.warnings,
          errorCount: payload.errorCount,
          warningCount: payload.warningCount,
        };
        break;
    }
    
    // Generate badge text
    let badgeText: string | null = null;
    if (filteredData.errorCount > 0) {
      badgeText = filteredData.errorCount === 1 
        ? '1 issue' 
        : `${filteredData.errorCount} issues`;
    } else if (filteredData.warningCount > 0) {
      badgeText = filteredData.warningCount === 1 
        ? '1 warning' 
        : `${filteredData.warningCount} warnings`;
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

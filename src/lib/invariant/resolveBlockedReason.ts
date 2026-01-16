/**
 * Blocked Reason Resolver
 * 
 * Consumes invariant reports and produces UI-ready "blocked reason" payloads.
 * 
 * PURELY INTERPRETIVE - Does NOT modify invariant behavior.
 * Preserves deterministic invariant ordering from the source report.
 * 
 * @version 1.0.0
 */

import {
  type InvariantCode,
  type InvariantExplainer,
  type AudienceLevel,
  type ExplainerCategory,
  INVARIANT_EXPLAINERS,
  isKnownInvariantCode,
} from './invariantExplainers';

// ============================================
// INPUT TYPES (from invariant reports)
// ============================================

/**
 * Violation shape from invariant checker
 * Matches InvariantViolation from creditInvariantChecker.ts
 */
export interface InvariantViolation {
  type: string;                           // InvariantCode
  severity: 'error' | 'warning';
  message: string;
  metrics?: Record<string, unknown>;
  affectedCourses?: string[];
}

/**
 * Report shape from invariant checker
 * Matches InvariantReport from creditInvariantChecker.ts
 */
export interface InvariantReport {
  ok: boolean;
  would_fail_strict?: boolean;
  errors: InvariantViolation[];
  warnings: InvariantViolation[];
  summary: string;
  computed?: Record<string, unknown>;
}

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Single explained violation for UI display
 */
export interface ExplainedViolation {
  code: InvariantCode;
  severity: 'error' | 'warning';
  
  // From explainer
  title: string;
  explanation: string;
  impact: string;
  suggestedFixes: string[];
  category: ExplainerCategory;
  
  // From original violation
  originalMessage: string;
  metrics?: Record<string, unknown>;
  affectedCourses?: string[];
}

/**
 * Fallback for unknown invariant codes
 */
export interface UnknownViolation {
  code: string;
  severity: 'error' | 'warning';
  title: string;
  explanation: string;
  originalMessage: string;
  isUnknownCode: true;
}

/**
 * UI-ready blocked reason payload
 */
export interface BlockedReasonPayload {
  // Status
  isBlocked: boolean;
  hasWarnings: boolean;
  wouldFailStrict: boolean;
  
  // Primary blocking reason (first hard fail)
  primaryBlocker: ExplainedViolation | null;
  
  // All violations (deterministic order preserved)
  errors: (ExplainedViolation | UnknownViolation)[];
  warnings: (ExplainedViolation | UnknownViolation)[];
  
  // Counts
  errorCount: number;
  warningCount: number;
  
  // Summary (from original report)
  summary: string;
  
  // Audience-filtered versions
  marketplaceSafe: {
    primaryBlocker: ExplainedViolation | null;
    errors: ExplainedViolation[];
    warnings: ExplainedViolation[];
    errorCount: number;
    warningCount: number;
  };
  
  publicSafe: {
    primaryBlocker: ExplainedViolation | null;
    errors: ExplainedViolation[];
    warnings: ExplainedViolation[];
    errorCount: number;
    warningCount: number;
  };
  
  // Metadata
  resolvedAt: string;
}

// ============================================
// RESOLVER IMPLEMENTATION
// ============================================

/**
 * Convert a single violation to an explained violation
 */
function explainViolation(
  violation: InvariantViolation
): ExplainedViolation | UnknownViolation {
  const code = violation.type;
  
  // Handle unknown codes gracefully
  if (!isKnownInvariantCode(code)) {
    return {
      code,
      severity: violation.severity,
      title: 'Unknown Validation Issue',
      explanation: `An unrecognized validation issue occurred (${code}).`,
      originalMessage: violation.message,
      isUnknownCode: true,
    };
  }
  
  const explainer = INVARIANT_EXPLAINERS[code];
  
  return {
    code,
    severity: violation.severity,
    title: explainer.title,
    explanation: explainer.explanation,
    impact: explainer.impact,
    suggestedFixes: explainer.suggestedFixes,
    category: explainer.category,
    originalMessage: violation.message,
    metrics: violation.metrics,
    affectedCourses: violation.affectedCourses,
  };
}

/**
 * Type guard for ExplainedViolation
 */
function isExplainedViolation(
  v: ExplainedViolation | UnknownViolation
): v is ExplainedViolation {
  return !('isUnknownCode' in v);
}

/**
 * Filter violations for audience level
 */
function filterForAudience(
  violations: (ExplainedViolation | UnknownViolation)[],
  audience: AudienceLevel
): ExplainedViolation[] {
  return violations.filter((v): v is ExplainedViolation => {
    if (!isExplainedViolation(v)) return false;
    
    const explainer = INVARIANT_EXPLAINERS[v.code];
    switch (audience) {
      case 'admin':
        return true;
      case 'marketplace':
        return explainer.showInMarketplace;
      case 'public':
        return explainer.showInPublic;
      default:
        return false;
    }
  });
}

/**
 * Main resolver function
 * 
 * Consumes an invariant report and produces a UI-ready payload.
 * Preserves deterministic ordering from the source report.
 */
export function resolveBlockedReason(report: InvariantReport): BlockedReasonPayload {
  // Process errors (preserving order)
  const explainedErrors = report.errors.map(explainViolation);
  
  // Process warnings (preserving order)
  const explainedWarnings = report.warnings.map(explainViolation);
  
  // Primary blocker is the FIRST error (deterministic)
  const firstError = explainedErrors[0] ?? null;
  const primaryBlocker = firstError && isExplainedViolation(firstError) 
    ? firstError 
    : null;
  
  // Filter for marketplace audience
  const marketplaceErrors = filterForAudience(explainedErrors, 'marketplace');
  const marketplaceWarnings = filterForAudience(explainedWarnings, 'marketplace');
  const marketplacePrimaryBlocker = marketplaceErrors[0] ?? null;
  
  // Filter for public audience
  const publicErrors = filterForAudience(explainedErrors, 'public');
  const publicWarnings = filterForAudience(explainedWarnings, 'public');
  const publicPrimaryBlocker = publicErrors[0] ?? null;
  
  return {
    isBlocked: !report.ok,
    hasWarnings: report.warnings.length > 0,
    wouldFailStrict: report.would_fail_strict ?? false,
    
    primaryBlocker,
    
    errors: explainedErrors,
    warnings: explainedWarnings,
    
    errorCount: explainedErrors.length,
    warningCount: explainedWarnings.length,
    
    summary: report.summary,
    
    marketplaceSafe: {
      primaryBlocker: marketplacePrimaryBlocker,
      errors: marketplaceErrors,
      warnings: marketplaceWarnings,
      errorCount: marketplaceErrors.length,
      warningCount: marketplaceWarnings.length,
    },
    
    publicSafe: {
      primaryBlocker: publicPrimaryBlocker,
      errors: publicErrors,
      warnings: publicWarnings,
      errorCount: publicErrors.length,
      warningCount: publicWarnings.length,
    },
    
    resolvedAt: new Date().toISOString(),
  };
}

// ============================================
// CONVENIENCE HELPERS
// ============================================

/**
 * Get a simple blocked message for marketplace display
 */
export function getMarketplaceBlockedMessage(report: InvariantReport): string | null {
  if (report.ok) return null;
  
  const payload = resolveBlockedReason(report);
  const blocker = payload.marketplaceSafe.primaryBlocker;
  
  if (!blocker) {
    return 'This template is currently unavailable.';
  }
  
  return blocker.title;
}

/**
 * Get a simple warning message for marketplace display
 */
export function getMarketplaceWarningMessage(report: InvariantReport): string | null {
  if (report.warnings.length === 0) return null;
  
  const payload = resolveBlockedReason(report);
  const { warnings } = payload.marketplaceSafe;
  
  if (warnings.length === 0) return null;
  if (warnings.length === 1) return warnings[0].title;
  
  return `${warnings.length} items need attention`;
}

/**
 * Check if any errors are admin-only (not safe for marketplace)
 */
export function hasAdminOnlyErrors(report: InvariantReport): boolean {
  const payload = resolveBlockedReason(report);
  return payload.errorCount > payload.marketplaceSafe.errorCount;
}

/**
 * Get all unique categories from violations
 */
export function getViolationCategories(report: InvariantReport): ExplainerCategory[] {
  const payload = resolveBlockedReason(report);
  const categories = new Set<ExplainerCategory>();
  
  for (const error of payload.errors) {
    if (isExplainedViolation(error)) {
      categories.add(error.category);
    }
  }
  for (const warning of payload.warnings) {
    if (isExplainedViolation(warning)) {
      categories.add(warning.category);
    }
  }
  
  return Array.from(categories);
}

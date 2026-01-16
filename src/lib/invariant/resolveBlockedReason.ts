/**
 * Blocked Reason Resolver
 * 
 * Consumes invariant reports and produces UI-ready "blocked reason" payloads.
 * 
 * PURELY INTERPRETIVE - Does NOT modify invariant behavior.
 * Preserves deterministic invariant ordering from the source report.
 * 
 * KEY SEMANTICS:
 * - Report uses 'error'|'warning' → mapped to 'hard'|'warn' at boundary
 * - Primary blocker is ALWAYS first hard fail (never null when blocked)
 * - Unknown codes get safe fallback titles
 * - Audience filtering only applies to display, not blocking logic
 * 
 * @version 1.1.0
 */

import {
  type AudienceLevel,
  type ExplainerCategory,
  type ExplainerSeverity,
  INVARIANT_EXPLAINERS,
  isKnownInvariantCode,
  UNKNOWN_CODE_ADMIN_TITLE,
  UNKNOWN_CODE_PUBLIC_TITLE,
} from './invariantExplainers';

// ============================================
// SEVERITY MAPPING (boundary layer)
// ============================================

/**
 * Map report severity to explainer severity
 * This is the ONE place where we translate from report semantics to explainer semantics
 * 
 * Report uses: 'error' | 'warning'
 * Explainer uses: 'hard' | 'warn'
 */
function mapReportSeverity(s: string): ExplainerSeverity {
  // Primary mapping: report → explainer
  if (s === 'error') return 'hard';
  if (s === 'warning') return 'warn';
  
  // Future-proof: if report already uses hard/warn
  if (s === 'hard') return 'hard';
  if (s === 'warn') return 'warn';
  
  // Safe fallback: treat unknown as hard (audit-safe)
  return 'hard';
}

// ============================================
// INPUT TYPES (from invariant reports)
// ============================================

/**
 * Violation shape from invariant checker
 * Matches InvariantViolation from creditInvariantChecker.ts
 * Note: Uses 'error'|'warning' which we map to 'hard'|'warn'
 */
export interface InvariantViolation {
  type: string;                           // InvariantCode
  severity: 'error' | 'warning';          // Report severity (mapped at boundary)
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
  errors: InvariantViolation[];           // Hard failures (severity: 'error')
  warnings: InvariantViolation[];         // Warnings (severity: 'warning')
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
  code: string;                           // InvariantCode or unknown code string
  severity: ExplainerSeverity;            // 'hard' | 'warn'
  isUnknownCode: false;
  
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
  
  // Visibility
  showInMarketplace: boolean;
  showInPublic: boolean;
}

/**
 * Fallback for unknown invariant codes
 * Always included in primary blocker selection (with safe title)
 */
export interface UnknownViolation {
  code: string;
  severity: ExplainerSeverity;            // 'hard' | 'warn'
  isUnknownCode: true;
  
  // Safe fallback titles
  title: string;                          // Admin-safe title
  titleMarketplace: string;               // Marketplace-safe title
  titlePublic: string;                    // Public-safe title
  explanation: string;
  
  // From original violation
  originalMessage: string;
  metrics?: Record<string, unknown>;
  affectedCourses?: string[];
  
  // Visibility (unknown codes hidden from marketplace/public by default)
  showInMarketplace: false;
  showInPublic: false;
}

export type AnyViolation = ExplainedViolation | UnknownViolation;

/**
 * Primary blocker for UI display
 * ALWAYS exists when isBlocked=true (never null)
 */
export interface PrimaryBlocker {
  code: string;
  severity: 'hard';
  title: string;
  explanation: string;
  isUnknownCode: boolean;
  originalMessage: string;
}

/**
 * UI-ready blocked reason payload
 */
export interface BlockedReasonPayload {
  // Status
  isBlocked: boolean;
  hasWarnings: boolean;
  wouldFailStrict: boolean;
  
  // Primary blocking reason (first hard fail - NEVER null when blocked)
  primaryBlocker: PrimaryBlocker | null;
  
  // All violations (deterministic order preserved, mapped to hard/warn)
  hardFailures: AnyViolation[];           // All hard failures
  warnings: AnyViolation[];               // All warnings
  
  // Counts
  hardCount: number;
  warnCount: number;
  
  // Summary (from original report)
  summary: string;
  
  // Audience-filtered versions (only visible violations)
  marketplaceSafe: {
    primaryBlocker: PrimaryBlocker | null;
    hardFailures: ExplainedViolation[];
    warnings: ExplainedViolation[];
    hardCount: number;
    warnCount: number;
  };
  
  publicSafe: {
    primaryBlocker: PrimaryBlocker | null;
    hardFailures: ExplainedViolation[];
    warnings: ExplainedViolation[];
    hardCount: number;
    warnCount: number;
  };
  
  // Metadata
  resolvedAt: string;
}

// ============================================
// RESOLVER IMPLEMENTATION
// ============================================

/**
 * Convert a single violation to an explained or unknown violation
 */
function explainViolation(
  violation: InvariantViolation
): AnyViolation {
  const code = violation.type;
  const severity = mapReportSeverity(violation.severity);
  
  // Handle unknown codes gracefully (still include in blocker selection)
  if (!isKnownInvariantCode(code)) {
    return {
      code,
      severity,
      isUnknownCode: true,
      title: UNKNOWN_CODE_ADMIN_TITLE,
      titleMarketplace: UNKNOWN_CODE_PUBLIC_TITLE,
      titlePublic: UNKNOWN_CODE_PUBLIC_TITLE,
      explanation: `An unrecognized validation rule was triggered.`, // No code leak
      originalMessage: violation.message,
      metrics: violation.metrics,
      affectedCourses: violation.affectedCourses,
      showInMarketplace: false,
      showInPublic: false,
    };
  }
  
  const explainer = INVARIANT_EXPLAINERS[code];
  
  return {
    code,
    severity,
    isUnknownCode: false,
    title: explainer.title,
    explanation: explainer.explanation,
    impact: explainer.impact,
    suggestedFixes: explainer.suggestedFixes,
    category: explainer.category,
    originalMessage: violation.message,
    metrics: violation.metrics,
    affectedCourses: violation.affectedCourses,
    showInMarketplace: explainer.showInMarketplace,
    showInPublic: explainer.showInPublic,
  };
}

/**
 * Type guard for ExplainedViolation
 */
function isExplainedViolation(v: AnyViolation): v is ExplainedViolation {
  return !v.isUnknownCode;
}

/**
 * Get title for a violation based on audience
 */
function getViolationTitle(v: AnyViolation, audience: AudienceLevel): string {
  if (isExplainedViolation(v)) {
    return v.title;
  }
  // Unknown violation - use audience-appropriate title
  switch (audience) {
    case 'admin':
      return v.title;
    case 'marketplace':
      return v.titleMarketplace;
    case 'public':
      return v.titlePublic;
    default:
      return v.title;
  }
}

/**
 * Build primary blocker from first hard failure
 * Returns non-null when blocked (guarantees primary blocker exists)
 */
function buildPrimaryBlocker(
  hardFailures: AnyViolation[],
  audience: AudienceLevel
): PrimaryBlocker | null {
  if (hardFailures.length === 0) return null;
  
  const first = hardFailures[0];
  return {
    code: first.code,
    severity: 'hard',
    title: getViolationTitle(first, audience),
    explanation: first.explanation,
    isUnknownCode: first.isUnknownCode,
    originalMessage: first.originalMessage,
  };
}

/**
 * Filter violations for audience visibility
 * Works for BOTH hardFailures and warnings
 * Returns ONLY visible violations (ExplainedViolation only)
 */
function filterViolationsForAudience(
  violations: AnyViolation[],
  audience: AudienceLevel
): ExplainedViolation[] {
  return violations.filter((v): v is ExplainedViolation => {
    if (v.isUnknownCode) return false; // Unknown codes hidden from marketplace/public
    
    switch (audience) {
      case 'admin':
        return true;
      case 'marketplace':
        return v.showInMarketplace;
      case 'public':
        return v.showInPublic;
      default:
        return false;
    }
  });
}

/**
 * Get first visible hard failure for audience-specific primary blocker
 */
function getAudiencePrimaryBlocker(
  hardFailures: AnyViolation[],
  audience: AudienceLevel
): PrimaryBlocker | null {
  const visible = filterViolationsForAudience(hardFailures, audience);
  if (visible.length === 0) return null;
  
  const first = visible[0];
  return {
    code: first.code,
    severity: 'hard',
    title: first.title,
    explanation: first.explanation,
    isUnknownCode: false,
    originalMessage: first.originalMessage,
  };
}

/**
 * Create an UNKNOWN_BLOCKER fallback for edge cases
 * Used when isBlocked=true but no errors exist (should be rare)
 */
function createUnknownBlockerFallback(summary: string): PrimaryBlocker {
  return {
    code: 'UNKNOWN_BLOCKER',
    severity: 'hard',
    title: UNKNOWN_CODE_ADMIN_TITLE,
    explanation: 'The template was blocked, but no specific invariant was provided.',
    isUnknownCode: true,
    originalMessage: summary || 'Blocked',
  };
}

/**
 * Main resolver function
 * 
 * Consumes an invariant report and produces a UI-ready payload.
 * Preserves deterministic ordering from the source report.
 * 
 * KEY GUARANTEES:
 * - primaryBlocker is NEVER null when isBlocked=true
 * - Severity is mapped: error→hard, warning→warn
 * - Unknown codes get safe fallback titles
 * - Audience filtering only affects display lists, not blocking logic
 */
export function resolveBlockedReason(report: InvariantReport): BlockedReasonPayload {
  const isBlocked = !report.ok;
  
  // Process hard failures (from errors array, preserving order)
  const hardFailures = report.errors.map(explainViolation);
  
  // Process warnings (preserving order)
  const warnings = report.warnings.map(explainViolation);
  
  // Primary blocker: MUST exist when blocked (guaranteed)
  // If no hard failures but still blocked, use fallback
  const primaryBlocker = isBlocked
    ? (buildPrimaryBlocker(hardFailures, 'admin') ?? createUnknownBlockerFallback(report.summary))
    : buildPrimaryBlocker(hardFailures, 'admin');
  
  // Marketplace-filtered (visible violations only)
  const marketplaceHard = filterViolationsForAudience(hardFailures, 'marketplace');
  const marketplaceWarn = filterViolationsForAudience(warnings, 'marketplace');
  const marketplacePrimaryBlocker = getAudiencePrimaryBlocker(hardFailures, 'marketplace');
  
  // Public-filtered (visible violations only)
  const publicHard = filterViolationsForAudience(hardFailures, 'public');
  const publicWarn = filterViolationsForAudience(warnings, 'public');
  const publicPrimaryBlocker = getAudiencePrimaryBlocker(hardFailures, 'public');
  
  return {
    isBlocked,
    hasWarnings: report.warnings.length > 0,
    wouldFailStrict: report.would_fail_strict ?? false,
    
    primaryBlocker,
    
    hardFailures,
    warnings,
    
    hardCount: hardFailures.length,
    warnCount: warnings.length,
    
    summary: report.summary,
    
    marketplaceSafe: {
      primaryBlocker: marketplacePrimaryBlocker,
      hardFailures: marketplaceHard,
      warnings: marketplaceWarn,
      hardCount: marketplaceHard.length,
      warnCount: marketplaceWarn.length,
    },
    
    publicSafe: {
      primaryBlocker: publicPrimaryBlocker,
      hardFailures: publicHard,
      warnings: publicWarn,
      hardCount: publicHard.length,
      warnCount: publicWarn.length,
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
  
  // Fallback if no visible blocker (admin-only errors)
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
  return payload.hardCount > payload.marketplaceSafe.hardCount;
}

/**
 * Get all unique categories from violations
 */
export function getViolationCategories(report: InvariantReport): ExplainerCategory[] {
  const payload = resolveBlockedReason(report);
  const categories = new Set<ExplainerCategory>();
  
  for (const v of payload.hardFailures) {
    if (isExplainedViolation(v)) {
      categories.add(v.category);
    }
  }
  for (const v of payload.warnings) {
    if (isExplainedViolation(v)) {
      categories.add(v.category);
    }
  }
  
  return Array.from(categories);
}

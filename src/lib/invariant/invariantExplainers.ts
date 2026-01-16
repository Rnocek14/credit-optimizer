/**
 * Invariant Explainer System
 * 
 * PURELY INTERPRETIVE - Does NOT modify invariant behavior.
 * 
 * This module translates invariant codes into human-readable explanations
 * for admins, marketplace users, and audit/compliance reviews.
 * 
 * Design principles:
 * - Read-only: consumes invariant reports, never mutates
 * - Deterministic: preserves invariant ordering
 * - Audience-aware: different visibility levels
 * - Audit-safe: all explanations are policy-neutral and traceable
 * 
 * @version 1.0.0
 */

// ============================================
// TYPES
// ============================================

/**
 * Canonical invariant codes from creditInvariantChecker.ts
 * Keep in sync with InvariantType union
 */
export type InvariantCode =
  // Foundational (v1.2) - check first
  | 'INV_NEGATIVE_OR_NAN_CREDITS'
  | 'INV_CREDIT_ACCOUNTING_UNBALANCED'
  // Hard invariants (v1)
  | 'INV_TOTAL_CREDITS_MISMATCH'
  | 'INV_RESIDENCY_NOT_MET'
  | 'INV_BUCKET_MODE_UNKNOWN'
  | 'INV_COMBINED_CAP_EXCEEDED'
  | 'INV_ALT_CAP_EXCEEDED'
  | 'INV_TRANSFER_CAP_EXCEEDED'
  | 'INV_PROVIDER_CAP_EXCEEDED'
  | 'INV_UPPER_DIVISION_NOT_MET'
  | 'INV_CAPSTONE_NOT_IN_RESIDENCE'
  // v1.1 errors
  | 'INV_UNKNOWN_SOURCE'
  | 'INV_POLICY_MISSING_COMBINED_CAP'
  | 'INV_POLICY_MISSING_ALT_CAP'
  // v1.2 status-aware errors
  | 'INV_UNKNOWN_CREDITS_NONZERO_ACTIVE'
  | 'INV_POLICY_MISSING_TRANSFER_CAP'
  // Warnings
  | 'INV_UNKNOWN_CREDITS_EXCEEDS_THRESHOLD'
  | 'INV_DUPLICATE_EQUIVALENCY'
  | 'INV_PREREQUISITES_UNMET'
  | 'INV_GENED_INCOMPLETE';

export type ExplainerSeverity = 'error' | 'warning';

/**
 * Audience visibility levels
 * - admin: Full details, internal terminology allowed
 * - marketplace: User-safe messaging, no internal jargon
 * - public: Minimal, safe for end-users
 */
export type AudienceLevel = 'admin' | 'marketplace' | 'public';

/**
 * Single explainer entry for an invariant code
 */
export interface InvariantExplainer {
  code: InvariantCode;
  severity: ExplainerSeverity;
  
  // Copy
  title: string;                    // Short label (e.g., "Credit Mismatch")
  explanation: string;              // What this means
  impact: string;                   // Why it matters
  suggestedFixes: string[];         // Actionable steps
  
  // Visibility
  showInMarketplace: boolean;       // Safe for marketplace users
  showInPublic: boolean;            // Safe for end-users
  
  // Metadata
  category: ExplainerCategory;
  version: string;                  // Explainer copy version (not invariant version)
}

export type ExplainerCategory = 
  | 'foundational'    // Math correctness
  | 'policy'          // Policy cap violations
  | 'structure'       // Template structure issues
  | 'completeness'    // Missing requirements
  | 'data_quality';   // Data integrity warnings

// ============================================
// EXPLAINER REGISTRY
// ============================================

export const INVARIANT_EXPLAINERS: Record<InvariantCode, InvariantExplainer> = {
  // ─────────────────────────────────────────
  // FOUNDATIONAL (v1.2) - Critical math errors
  // ─────────────────────────────────────────
  INV_NEGATIVE_OR_NAN_CREDITS: {
    code: 'INV_NEGATIVE_OR_NAN_CREDITS',
    severity: 'error',
    title: 'Invalid Credit Values',
    explanation: 'The template contains negative or invalid credit values that prevent accurate calculations.',
    impact: 'Templates with invalid credit values cannot be used for degree planning as the math would be unreliable.',
    suggestedFixes: [
      'Review all course credit values for negative numbers',
      'Check for calculation errors in credit summation',
      'Ensure all credit fields contain valid numeric values',
    ],
    showInMarketplace: true,
    showInPublic: false,
    category: 'foundational',
    version: '1.0.0',
  },

  INV_CREDIT_ACCOUNTING_UNBALANCED: {
    code: 'INV_CREDIT_ACCOUNTING_UNBALANCED',
    severity: 'error',
    title: 'Credit Accounting Error',
    explanation: 'The sum of individual credit categories does not match the total credits in the template.',
    impact: 'Unbalanced credit accounting means the template cannot accurately represent degree requirements.',
    suggestedFixes: [
      'Verify that resident + transfer + alternative credits equal total credits',
      'Check for missing or miscategorized courses',
      'Review credit source assignments for each course',
    ],
    showInMarketplace: true,
    showInPublic: false,
    category: 'foundational',
    version: '1.0.0',
  },

  // ─────────────────────────────────────────
  // HARD INVARIANTS (v1) - Policy violations
  // ─────────────────────────────────────────
  INV_TOTAL_CREDITS_MISMATCH: {
    code: 'INV_TOTAL_CREDITS_MISMATCH',
    severity: 'error',
    title: 'Total Credits Mismatch',
    explanation: 'The template does not meet the degree\'s total credit requirement.',
    impact: 'Students using this template would not graduate with the required number of credits.',
    suggestedFixes: [
      'Add or remove courses to match the degree\'s total credit requirement',
      'Verify the degree program\'s credit requirements are correctly configured',
      'Check for courses with incorrect credit values',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'policy',
    version: '1.0.0',
  },

  INV_RESIDENCY_NOT_MET: {
    code: 'INV_RESIDENCY_NOT_MET',
    severity: 'error',
    title: 'Residency Requirement Not Met',
    explanation: 'The template does not include enough credits from the degree-granting institution.',
    impact: 'Most institutions require a minimum number of credits to be completed at their school to grant a degree.',
    suggestedFixes: [
      'Add more courses from the degree-granting institution',
      'Review which courses are marked as resident vs. transfer',
      'Verify the institution\'s residency requirement is correctly configured',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'policy',
    version: '1.0.0',
  },

  INV_BUCKET_MODE_UNKNOWN: {
    code: 'INV_BUCKET_MODE_UNKNOWN',
    severity: 'error',
    title: 'Transfer Policy Mode Unknown',
    explanation: 'The institution\'s transfer credit policy mode (combined or separate caps) could not be determined.',
    impact: 'Without knowing the policy mode, credit caps cannot be properly enforced.',
    suggestedFixes: [
      'Configure the institution\'s transfer credit policy',
      'Specify whether the institution uses combined or separate credit caps',
      'Contact the institution to clarify their transfer credit policy',
    ],
    showInMarketplace: false,
    showInPublic: false,
    category: 'policy',
    version: '1.0.0',
  },

  INV_COMBINED_CAP_EXCEEDED: {
    code: 'INV_COMBINED_CAP_EXCEEDED',
    severity: 'error',
    title: 'Combined Transfer Cap Exceeded',
    explanation: 'The total transfer credits (traditional + alternative) exceed the institution\'s combined limit.',
    impact: 'The institution will not accept this many transfer credits, making the template unfeasible.',
    suggestedFixes: [
      'Reduce the number of transfer credits',
      'Replace some transfer courses with resident courses',
      'Verify the institution\'s transfer cap is correctly configured',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'policy',
    version: '1.0.0',
  },

  INV_ALT_CAP_EXCEEDED: {
    code: 'INV_ALT_CAP_EXCEEDED',
    severity: 'error',
    title: 'Alternative Credit Cap Exceeded',
    explanation: 'The template includes more alternative credits (CLEP, Sophia, etc.) than the institution allows.',
    impact: 'The institution has a specific limit on credits from alternative providers.',
    suggestedFixes: [
      'Reduce alternative credit courses',
      'Replace some alternative credits with traditional transfer or resident credits',
      'Prioritize alternative credits with higher acceptance rates',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'policy',
    version: '1.0.0',
  },

  INV_TRANSFER_CAP_EXCEEDED: {
    code: 'INV_TRANSFER_CAP_EXCEEDED',
    severity: 'error',
    title: 'Traditional Transfer Cap Exceeded',
    explanation: 'The template includes more traditional transfer credits than the institution allows.',
    impact: 'The institution has a specific limit on credits from other accredited institutions.',
    suggestedFixes: [
      'Reduce traditional transfer credit courses',
      'Replace some transfer credits with resident courses',
      'Consider using alternative credit options instead',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'policy',
    version: '1.0.0',
  },

  INV_PROVIDER_CAP_EXCEEDED: {
    code: 'INV_PROVIDER_CAP_EXCEEDED',
    severity: 'error',
    title: 'Provider Credit Limit Exceeded',
    explanation: 'Credits from a specific provider exceed the institution\'s limit for that provider.',
    impact: 'Some institutions limit how many credits can come from any single alternative provider.',
    suggestedFixes: [
      'Diversify credit sources across multiple providers',
      'Check institution-specific provider limits',
      'Replace some courses with credits from other providers',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'policy',
    version: '1.0.0',
  },

  INV_UPPER_DIVISION_NOT_MET: {
    code: 'INV_UPPER_DIVISION_NOT_MET',
    severity: 'error',
    title: 'Upper Division Requirement Not Met',
    explanation: 'The template does not include enough upper-division (300-400 level) courses.',
    impact: 'Bachelor\'s degrees typically require a minimum number of advanced coursework credits.',
    suggestedFixes: [
      'Add more 300-400 level courses',
      'Check which courses qualify as upper division',
      'Verify the upper division requirement is correctly configured',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'completeness',
    version: '1.0.0',
  },

  INV_CAPSTONE_NOT_IN_RESIDENCE: {
    code: 'INV_CAPSTONE_NOT_IN_RESIDENCE',
    severity: 'error',
    title: 'Capstone Course Required In Residence',
    explanation: 'The capstone course must be taken at the degree-granting institution, not transferred.',
    impact: 'Most institutions require the culminating capstone experience to be completed at their school.',
    suggestedFixes: [
      'Mark the capstone course as a resident course',
      'Remove any transferred capstone courses',
      'Verify capstone requirements for this program',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'structure',
    version: '1.0.0',
  },

  // ─────────────────────────────────────────
  // v1.1 ERRORS - Policy configuration issues
  // ─────────────────────────────────────────
  INV_UNKNOWN_SOURCE: {
    code: 'INV_UNKNOWN_SOURCE',
    severity: 'error',
    title: 'Unknown Credit Source',
    explanation: 'One or more courses have an unrecognized credit source.',
    impact: 'Courses with unknown sources cannot be properly categorized for cap enforcement.',
    suggestedFixes: [
      'Review courses with unrecognized source codes',
      'Update source codes to match known providers',
      'Add new providers to the system if needed',
    ],
    showInMarketplace: false,
    showInPublic: false,
    category: 'data_quality',
    version: '1.0.0',
  },

  INV_POLICY_MISSING_COMBINED_CAP: {
    code: 'INV_POLICY_MISSING_COMBINED_CAP',
    severity: 'error',
    title: 'Missing Combined Transfer Cap',
    explanation: 'The institution\'s combined transfer credit cap is not configured.',
    impact: 'Without a combined cap, the system cannot validate transfer credit limits.',
    suggestedFixes: [
      'Configure the institution\'s combined transfer credit limit',
      'Review the institution\'s official transfer policy',
      'Contact the institution to confirm their policy',
    ],
    showInMarketplace: false,
    showInPublic: false,
    category: 'policy',
    version: '1.0.0',
  },

  INV_POLICY_MISSING_ALT_CAP: {
    code: 'INV_POLICY_MISSING_ALT_CAP',
    severity: 'error',
    title: 'Missing Alternative Credit Cap',
    explanation: 'The institution\'s alternative credit cap is not configured.',
    impact: 'Without an alternative cap, limits on CLEP, Sophia, and similar credits cannot be enforced.',
    suggestedFixes: [
      'Configure the institution\'s alternative credit limit',
      'Review the institution\'s policy on non-traditional credits',
      'Check for a "noncollegiate pool" or similar policy',
    ],
    showInMarketplace: false,
    showInPublic: false,
    category: 'policy',
    version: '1.0.0',
  },

  // ─────────────────────────────────────────
  // v1.2 STATUS-AWARE ERRORS
  // ─────────────────────────────────────────
  INV_UNKNOWN_CREDITS_NONZERO_ACTIVE: {
    code: 'INV_UNKNOWN_CREDITS_NONZERO_ACTIVE',
    severity: 'error',
    title: 'Active Template Has Unknown Credits',
    explanation: 'An active template cannot have credits from unresolved or unknown sources.',
    impact: 'Active templates are shown to users; all credits must be verified before activation.',
    suggestedFixes: [
      'Resolve all unknown credit sources before activating',
      'Move the template back to pending review status',
      'Categorize or remove courses with unknown sources',
    ],
    showInMarketplace: true,
    showInPublic: false,
    category: 'data_quality',
    version: '1.0.0',
  },

  INV_POLICY_MISSING_TRANSFER_CAP: {
    code: 'INV_POLICY_MISSING_TRANSFER_CAP',
    severity: 'error',
    title: 'Missing Traditional Transfer Cap',
    explanation: 'The institution uses separate caps but the traditional transfer cap is not configured.',
    impact: 'Separate-mode institutions require both alternative AND traditional transfer caps.',
    suggestedFixes: [
      'Configure the institution\'s traditional transfer credit limit',
      'Review if the institution uses combined or separate cap mode',
      'Check the institution\'s community college transfer policy',
    ],
    showInMarketplace: false,
    showInPublic: false,
    category: 'policy',
    version: '1.0.0',
  },

  // ─────────────────────────────────────────
  // WARNINGS - Non-blocking issues
  // ─────────────────────────────────────────
  INV_UNKNOWN_CREDITS_EXCEEDS_THRESHOLD: {
    code: 'INV_UNKNOWN_CREDITS_EXCEEDS_THRESHOLD',
    severity: 'warning',
    title: 'High Unknown Credits',
    explanation: 'A significant portion of credits come from unknown or unverified sources.',
    impact: 'While not blocking, high unknown credits may indicate data quality issues.',
    suggestedFixes: [
      'Review and categorize courses with unknown sources',
      'Verify credit source data for accuracy',
      'Consider holding for review if unknown credits are substantial',
    ],
    showInMarketplace: true,
    showInPublic: false,
    category: 'data_quality',
    version: '1.0.0',
  },

  INV_DUPLICATE_EQUIVALENCY: {
    code: 'INV_DUPLICATE_EQUIVALENCY',
    severity: 'warning',
    title: 'Duplicate Course Equivalency',
    explanation: 'The same course requirement is being fulfilled by multiple transfer options.',
    impact: 'Duplicate equivalencies may confuse users or lead to double-counting.',
    suggestedFixes: [
      'Review courses that fulfill the same requirement',
      'Remove redundant equivalency mappings',
      'Ensure each requirement has a single primary fulfillment',
    ],
    showInMarketplace: true,
    showInPublic: false,
    category: 'data_quality',
    version: '1.0.0',
  },

  INV_PREREQUISITES_UNMET: {
    code: 'INV_PREREQUISITES_UNMET',
    severity: 'warning',
    title: 'Prerequisites Not Met',
    explanation: 'Some courses have prerequisites that are not included in the template.',
    impact: 'Students may need to take additional courses before certain template courses.',
    suggestedFixes: [
      'Add missing prerequisite courses to the template',
      'Note prerequisite requirements in course descriptions',
      'Verify prerequisite requirements are current',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'completeness',
    version: '1.0.0',
  },

  INV_GENED_INCOMPLETE: {
    code: 'INV_GENED_INCOMPLETE',
    severity: 'warning',
    title: 'General Education Incomplete',
    explanation: 'Not all general education requirements are fully satisfied by the template.',
    impact: 'Students may need additional courses to complete general education requirements.',
    suggestedFixes: [
      'Review which gen ed categories are incomplete',
      'Add courses that fulfill remaining gen ed requirements',
      'Check if any courses have gen ed designations not yet recorded',
    ],
    showInMarketplace: true,
    showInPublic: true,
    category: 'completeness',
    version: '1.0.0',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get explainer for a specific invariant code
 */
export function getExplainer(code: InvariantCode): InvariantExplainer | null {
  return INVARIANT_EXPLAINERS[code] ?? null;
}

/**
 * Get all explainers filtered by severity
 */
export function getExplainersBySeverity(severity: ExplainerSeverity): InvariantExplainer[] {
  return Object.values(INVARIANT_EXPLAINERS).filter(e => e.severity === severity);
}

/**
 * Get all explainers filtered by category
 */
export function getExplainersByCategory(category: ExplainerCategory): InvariantExplainer[] {
  return Object.values(INVARIANT_EXPLAINERS).filter(e => e.category === category);
}

/**
 * Filter explainers for a specific audience level
 */
export function getExplainersForAudience(audience: AudienceLevel): InvariantExplainer[] {
  return Object.values(INVARIANT_EXPLAINERS).filter(e => {
    switch (audience) {
      case 'admin':
        return true; // Admins see everything
      case 'marketplace':
        return e.showInMarketplace;
      case 'public':
        return e.showInPublic;
      default:
        return false;
    }
  });
}

/**
 * Check if an invariant code exists in the registry
 */
export function isKnownInvariantCode(code: string): code is InvariantCode {
  return code in INVARIANT_EXPLAINERS;
}

/**
 * Actionable Fixes System
 * 
 * Converts invariant explainer suggested fixes into clickable admin actions.
 * Provides deep links, action buttons, and context-aware parameters.
 * 
 * PURELY INTERPRETIVE - Does NOT modify invariant behavior.
 * 
 * @version 1.1.0
 */

import type { InvariantCode } from './invariantExplainers';

// ============================================
// ADMIN ROUTE CONSTANTS (prevent drift)
// ============================================

/**
 * Centralized admin routes to prevent hardcoded string drift.
 * Keep in sync with App.tsx route definitions.
 * 
 * Usage: Always reference ADMIN_ROUTES.<key> in fix registry.
 * The AdminRouteKey type ensures compile-time safety.
 */
export const ADMIN_ROUTES = {
  policyRefresh: '/admin/policy-refresh',
  templateValidation: '/admin/template-validation',
  transferScraper: '/admin/transfer-scraper',
  settings: '/admin/settings',
  generationJobs: '/admin/generation-jobs',
  policyPromotion: '/admin/policy-promotion',
} as const;

/** Type-safe route key for compile-time enforcement */
export type AdminRouteKey = keyof typeof ADMIN_ROUTES;

/** Type-safe route value */
export type AdminRoute = typeof ADMIN_ROUTES[AdminRouteKey];

// ============================================
// TYPES
// ============================================

/**
 * Action types available for fixes
 */
export type FixActionType = 
  | 'navigate'           // Deep link to admin page
  | 'navigate_with_field' // Deep link + highlight specific field
  | 'invoke_function'    // Trigger edge function
  | 'set_status'         // Change template status
  | 'rerun_validation';  // Re-run invariant scan

/**
 * Context passed to action handlers
 */
export interface FixActionContext {
  templateId?: string;
  institutionCode?: string;
  programCode?: string;
  policyPackId?: string;
  jobId?: string;
  catalogYear?: string;
}

/**
 * Single actionable fix definition
 */
export interface ActionableFix {
  id: string;                     // Unique fix identifier
  label: string;                  // Button/link text
  description: string;            // Tooltip or helper text
  actionType: FixActionType;
  
  // For navigation actions
  route?: string;                 // Route template with :placeholders
  queryParams?: Record<string, string>;
  highlightField?: string;        // Field to highlight on destination
  
  // For function invocations
  functionName?: string;          // Edge function to call
  functionParams?: Record<string, unknown>;
  
  // For status changes
  targetStatus?: string;          // Status to set
  
  // UI hints
  icon?: string;                  // Lucide icon name
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  
  // Visibility
  requiresAdmin?: boolean;        // Only show to admins
  priority?: number;              // Sort order (lower = first)
}

/**
 * Resolved fix with computed route and validation state
 */
export interface ResolvedFix extends ActionableFix {
  resolvedRoute?: string;
  hasUnresolvedPlaceholders: boolean;
  missingContextFields: string[];
}

/**
 * Mapping from invariant code to its actionable fixes
 */
export interface InvariantFixMapping {
  code: InvariantCode;
  fixes: ActionableFix[];
}

// ============================================
// FIX REGISTRY
// ============================================

/**
 * Registry of actionable fixes per invariant code
 * 
 * Design principles:
 * - Each fix is a single, focused action
 * - Actions are context-aware (use placeholders)
 * - Higher priority fixes appear first
 * - Dangerous actions require confirmation
 */
export const INVARIANT_FIX_REGISTRY: Record<InvariantCode, ActionableFix[]> = {
  // ----------------------------------------
  // Foundational Errors (v1.2)
  // ----------------------------------------
  
  INV_NEGATIVE_OR_NAN_CREDITS: [
    {
      id: 'review_course_mappings',
      label: 'Review Course Mappings',
      description: 'Check source data for invalid credit values',
      actionType: 'navigate',
      route: ADMIN_ROUTES.transferScraper,
      queryParams: { tab: 'review' },
      icon: 'Search',
      priority: 1,
    },
    {
      id: 'set_pending_review',
      label: 'Move to Pending Review',
      description: 'Flag template for manual data correction',
      actionType: 'set_status',
      targetStatus: 'pending_review',
      icon: 'Clock',
      priority: 2,
      requiresConfirmation: true,
      confirmationMessage: 'This will move the template to pending review status.',
    },
  ],
  
  INV_CREDIT_ACCOUNTING_UNBALANCED: [
    {
      id: 'view_credit_breakdown',
      label: 'View Credit Breakdown',
      description: 'Inspect how credits are allocated',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId' },
      icon: 'Calculator',
      priority: 1,
    },
    {
      id: 'rerun_validation',
      label: 'Re-run Validation',
      description: 'Recalculate credit totals from source',
      actionType: 'rerun_validation',
      icon: 'RefreshCw',
      priority: 2,
    },
  ],
  
  // ----------------------------------------
  // Hard Invariants (v1)
  // ----------------------------------------
  
  INV_TOTAL_CREDITS_MISMATCH: [
    {
      id: 'view_template_courses',
      label: 'View Template Courses',
      description: 'Review courses and their credit allocations',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'courses' },
      icon: 'List',
      priority: 1,
    },
    {
      id: 'check_policy_total',
      label: 'Check Policy Total',
      description: 'Verify total credits in policy pack',
      actionType: 'navigate',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'total_credits',
      icon: 'FileText',
      priority: 2,
    },
  ],
  
  INV_RESIDENCY_NOT_MET: [
    {
      id: 'view_residency_courses',
      label: 'View Residency Allocation',
      description: 'Check which courses count toward residency',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'residency' },
      icon: 'Building',
      priority: 1,
    },
    {
      id: 'edit_residency_requirement',
      label: 'Edit Residency Requirement',
      description: 'Adjust minimum residency credits in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'min_residency_credits',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  INV_BUCKET_MODE_UNKNOWN: [
    {
      id: 'set_bucket_mode',
      label: 'Configure Bucket Mode',
      description: 'Set transfer credit bucket mode in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'bucket_mode',
      icon: 'Settings',
      priority: 1,
    },
  ],
  
  INV_COMBINED_CAP_EXCEEDED: [
    {
      id: 'view_transfer_breakdown',
      label: 'View Transfer Breakdown',
      description: 'See how transfer credits are distributed',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'transfers' },
      icon: 'PieChart',
      priority: 1,
    },
    {
      id: 'edit_combined_cap',
      label: 'Edit Combined Cap',
      description: 'Adjust max_combined_transfer in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_combined_transfer',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  INV_ALT_CAP_EXCEEDED: [
    {
      id: 'view_alt_credits',
      label: 'View Alt Credit Usage',
      description: 'See alternative credit breakdown',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'alt_credits' },
      icon: 'Layers',
      priority: 1,
    },
    {
      id: 'edit_alt_cap',
      label: 'Edit Alt Credit Cap',
      description: 'Adjust max_alt_credits in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_alt_credits',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  INV_TRANSFER_CAP_EXCEEDED: [
    {
      id: 'view_transfer_credits',
      label: 'View Transfer Usage',
      description: 'See traditional transfer credit breakdown',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'transfers' },
      icon: 'ArrowRightLeft',
      priority: 1,
    },
    {
      id: 'edit_transfer_cap',
      label: 'Edit Transfer Cap',
      description: 'Adjust max_transfer_credits in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_transfer_credits',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  INV_PROVIDER_CAP_EXCEEDED: [
    {
      id: 'view_provider_breakdown',
      label: 'View Provider Breakdown',
      description: 'See credits by provider',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'providers' },
      icon: 'Users',
      priority: 1,
    },
    {
      id: 'edit_provider_caps',
      label: 'Edit Provider Caps',
      description: 'Adjust per-provider limits in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'provider_caps',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  INV_UPPER_DIVISION_NOT_MET: [
    {
      id: 'view_course_levels',
      label: 'View Course Levels',
      description: 'See upper vs lower division distribution',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'levels' },
      icon: 'BarChart',
      priority: 1,
    },
    {
      id: 'edit_upper_div_requirement',
      label: 'Edit Upper Division Requirement',
      description: 'Adjust minimum upper division credits',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'min_upper_division',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  INV_CAPSTONE_NOT_IN_RESIDENCE: [
    {
      id: 'view_capstone_courses',
      label: 'View Capstone Assignment',
      description: 'Check how capstone is allocated',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'capstone' },
      icon: 'GraduationCap',
      priority: 1,
    },
    {
      id: 'edit_capstone_rule',
      label: 'Edit Capstone Rule',
      description: 'Adjust capstone residency requirement',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'capstone_residency_required',
      icon: 'Edit',
      priority: 2,
    },
  ],
  
  // ----------------------------------------
  // v1.1 Errors
  // ----------------------------------------
  
  INV_UNKNOWN_SOURCE: [
    {
      id: 'review_course_sources',
      label: 'Review Course Sources',
      description: 'Check unrecognized course sources',
      actionType: 'navigate',
      route: ADMIN_ROUTES.transferScraper,
      queryParams: { tab: 'unknown' },
      icon: 'HelpCircle',
      priority: 1,
    },
    {
      id: 'add_source_mapping',
      label: 'Add Source Mapping',
      description: 'Configure new source in system',
      actionType: 'navigate',
      route: ADMIN_ROUTES.settings,
      queryParams: { tab: 'sources' },
      icon: 'Plus',
      priority: 2,
    },
  ],
  
  INV_POLICY_MISSING_COMBINED_CAP: [
    {
      id: 'add_combined_cap',
      label: 'Add Combined Cap',
      description: 'Configure max_combined_transfer in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_combined_transfer',
      icon: 'Plus',
      priority: 1,
    },
  ],
  
  INV_POLICY_MISSING_ALT_CAP: [
    {
      id: 'add_alt_cap',
      label: 'Add Alt Credit Cap',
      description: 'Configure max_alt_credits in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_alt_credits',
      icon: 'Plus',
      priority: 1,
    },
  ],
  
  // ----------------------------------------
  // v1.2 Status-Aware Errors
  // ----------------------------------------
  
  INV_UNKNOWN_CREDITS_NONZERO_ACTIVE: [
    {
      id: 'review_unknown_courses',
      label: 'Review Unknown Courses',
      description: 'Identify and classify unknown credits',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'unknown' },
      icon: 'AlertCircle',
      priority: 1,
    },
    {
      id: 'set_pending_review',
      label: 'Move to Pending Review',
      description: 'Template cannot be active with unknown credits',
      actionType: 'set_status',
      targetStatus: 'pending_review',
      icon: 'Clock',
      priority: 2,
      requiresConfirmation: true,
      confirmationMessage: 'This will move the template to pending review status.',
    },
  ],
  
  INV_POLICY_MISSING_TRANSFER_CAP: [
    {
      id: 'add_transfer_cap',
      label: 'Add Transfer Cap',
      description: 'Configure max_transfer_credits in policy',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_transfer_credits',
      icon: 'Plus',
      priority: 1,
    },
    {
      id: 'add_alt_cap',
      label: 'Add Alt Credit Cap',
      description: 'Configure max_alt_credits in policy (separate mode requires both)',
      actionType: 'navigate_with_field',
      route: ADMIN_ROUTES.policyRefresh,
      queryParams: { institution: ':institutionCode' },
      highlightField: 'max_alt_credits',
      icon: 'Plus',
      priority: 2,
    },
  ],
  
  // ----------------------------------------
  // Warnings
  // ----------------------------------------
  
  INV_UNKNOWN_CREDITS_EXCEEDS_THRESHOLD: [
    {
      id: 'review_unknown_courses',
      label: 'Review Unknown Courses',
      description: 'Classify courses to reduce unknown credits',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'unknown' },
      icon: 'Search',
      priority: 1,
    },
  ],
  
  INV_DUPLICATE_EQUIVALENCY: [
    {
      id: 'review_equivalencies',
      label: 'Review Equivalencies',
      description: 'Check for duplicate course mappings',
      actionType: 'navigate',
      route: ADMIN_ROUTES.transferScraper,
      queryParams: { tab: 'equivalencies', filter: 'duplicates' },
      icon: 'Copy',
      priority: 1,
    },
  ],
  
  INV_PREREQUISITES_UNMET: [
    {
      id: 'view_prerequisites',
      label: 'View Prerequisites',
      description: 'Check course ordering and prerequisites',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'prerequisites' },
      icon: 'GitBranch',
      priority: 1,
    },
  ],
  
  INV_GENED_INCOMPLETE: [
    {
      id: 'view_gened_coverage',
      label: 'View Gen Ed Coverage',
      description: 'Check general education requirements',
      actionType: 'navigate',
      route: ADMIN_ROUTES.templateValidation,
      queryParams: { template: ':templateId', view: 'gened' },
      icon: 'BookOpen',
      priority: 1,
    },
  ],
};

// ============================================
// RESOLUTION HELPERS
// ============================================

/**
 * Check if a URL has unresolved placeholders
 */
export function hasUnresolvedPlaceholders(url: string): boolean {
  return /:[\w]+/.test(url);
}

/**
 * Extract missing placeholder field names from a URL
 */
export function extractMissingPlaceholders(url: string): string[] {
  const matches = url.match(/:(\w+)/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1)); // Remove the leading ':'
}

/**
 * Get actionable fixes for an invariant code
 */
export function getFixesForCode(code: string): ActionableFix[] {
  if (code in INVARIANT_FIX_REGISTRY) {
    return INVARIANT_FIX_REGISTRY[code as InvariantCode];
  }
  
  // Fallback for unknown codes
  return [
    {
      id: 'contact_support',
      label: 'Contact Support',
      description: 'Get help resolving this issue',
      actionType: 'navigate',
      route: ADMIN_ROUTES.settings,
      queryParams: { tab: 'support' },
      icon: 'MessageCircle',
      priority: 1,
    },
  ];
}

/**
 * Resolve route placeholders with context values
 * Safe for non-string values in queryParams (coerces to string)
 */
export function resolveRoute(
  route: string,
  queryParams: Record<string, string> | undefined,
  context: FixActionContext
): { url: string; hasUnresolved: boolean; missingFields: string[] } {
  let resolvedRoute = route;
  const resolvedParams: Record<string, string> = {};
  const missingFields: string[] = [];
  
  // Replace :placeholders in route path
  resolvedRoute = resolvedRoute.replace(/:(\w+)/g, (match, key: string) => {
    const contextKey = key as keyof FixActionContext;
    const value = context[contextKey];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    missingFields.push(String(key)); // Explicit string coercion
    return match; // Keep placeholder if not found
  });
  
  // Replace :placeholders in query params (with string safety)
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = String(rawValue); // Coerce to string for safety
      
      if (value.startsWith(':')) {
        const contextKey = value.slice(1) as keyof FixActionContext;
        const contextValue = context[contextKey];
        if (contextValue !== undefined && contextValue !== null) {
          resolvedParams[key] = String(contextValue);
        } else {
          missingFields.push(String(contextKey)); // Explicit string coercion
          // Don't include param with unresolved placeholder
        }
      } else {
        resolvedParams[key] = value;
      }
    }
  }
  
  // Build query string
  const queryString = new URLSearchParams(resolvedParams).toString();
  const url = queryString ? `${resolvedRoute}?${queryString}` : resolvedRoute;
  
  return {
    url,
    hasUnresolved: hasUnresolvedPlaceholders(url) || missingFields.length > 0,
    missingFields: [...new Set(missingFields)], // Dedupe
  };
}

/**
 * Get prioritized fixes for display with full resolution metadata
 */
export function getPrioritizedFixes(
  code: string,
  context: FixActionContext,
  options: { maxFixes?: number; adminOnly?: boolean; includeUnresolved?: boolean } = {}
): ResolvedFix[] {
  const { maxFixes = 3, adminOnly = true, includeUnresolved = true } = options;
  
  const fixes = getFixesForCode(code)
    .filter(fix => !fix.requiresAdmin || adminOnly)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, maxFixes);
  
  // Resolve routes and add metadata
  const resolved: ResolvedFix[] = fixes.map(fix => {
    if (fix.route) {
      const result = resolveRoute(fix.route, fix.queryParams, context);
      return {
        ...fix,
        resolvedRoute: result.url,
        hasUnresolvedPlaceholders: result.hasUnresolved,
        missingContextFields: result.missingFields,
      };
    }
    
    // Non-navigation actions (set_status, rerun_validation, etc.)
    return {
      ...fix,
      resolvedRoute: undefined,
      hasUnresolvedPlaceholders: false,
      missingContextFields: [],
    };
  });
  
  // Optionally filter out fixes with unresolved placeholders
  if (!includeUnresolved) {
    return resolved.filter(fix => !fix.hasUnresolvedPlaceholders);
  }
  
  return resolved;
}

/**
 * Get the primary fix action for quick display
 */
export function getPrimaryFix(
  code: string,
  context: FixActionContext
): ResolvedFix | null {
  const fixes = getPrioritizedFixes(code, context, { maxFixes: 1 });
  return fixes[0] ?? null;
}

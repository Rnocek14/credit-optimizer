/**
 * Transfer Engine - Central module for all transfer rule validation
 * 
 * This module provides the single source of truth for transfer credit validation.
 * All planners, template generators, and apply hooks should use this API.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface TransferRuleCheckResult {
  accepted: boolean;          // safe to auto-use in templates/planners
  electiveOnly: boolean;      // transfers, but as elective only
  targetEquivCode?: string;   // mapped target course code, if any
  confidence: number;         // 0-1; always present
}

type TransferRuleCacheEntry =
  | {
      acceptance_status: 'accepted' | 'elective' | 'rejected';
      target_equiv_code?: string | null;
      confidence?: number | null;
    }
  | null;

// ============================================================================
// Cache
// ============================================================================

const transferRuleCache: Record<string, TransferRuleCacheEntry> = {};

// ============================================================================
// Core Transfer Rule Checker
// ============================================================================

/**
 * Core transfer rule checker used by:
 *  - yearPlanner
 *  - templateGenerator
 *  - applyTemplate hooks
 *  - (optionally) course list / badges
 *
 * Default behavior:
 *  - Institutional courses (provider === target) are always accepted at 1.0 confidence.
 *  - If no rule is found, course is NOT accepted (strict mode).
 *  - Only rules with confidence >= minConfidence are auto-accepted.
 */
export async function checkTransferRule(
  providerCode: string | null | undefined,
  courseCode: string,
  targetSchool: string | null | undefined,
  opts?: {
    requirementType?: 'major' | 'elective' | 'genED';
    minConfidence?: number;
  }
): Promise<TransferRuleCheckResult> {
  const minConfidence = opts?.minConfidence ?? 0.7;
  const requirementType = opts?.requirementType ?? 'major';

  const provider = (providerCode || '').trim().toUpperCase();
  const target = (targetSchool || '').trim().toUpperCase();
  const code = (courseCode || '').trim().toUpperCase();

  // If we don't know the target school, we can't do transfer validation
  if (!target || !code) {
    return {
      accepted: false,
      electiveOnly: false,
      targetEquivCode: undefined,
      confidence: 0,
    };
  }

  const cacheKey = `${provider}|${code}|${target}`;

  // 1) Cache hit
  const cached = transferRuleCache[cacheKey];
  if (cached !== undefined) {
    if (cached === null) {
      // Cached as "no safe rule"
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    const rawConfidence = cached.confidence ?? 0.5;
    const normalizedConfidence = Math.max(0, Math.min(1, rawConfidence));

    // For major requirements, only 'accepted' status counts
    // For elective/genED, both 'accepted' and 'elective' are okay
    const acceptedByStatus =
      cached.acceptance_status === 'accepted' ||
      (requirementType !== 'major' && cached.acceptance_status === 'elective');

    const accepted =
      acceptedByStatus && normalizedConfidence >= minConfidence;

    return {
      accepted,
      electiveOnly: cached.acceptance_status === 'elective',
      targetEquivCode: cached.target_equiv_code || undefined,
      confidence: normalizedConfidence,
    };
  }

  // 2) Institutional courses are always safe
  if (provider && provider === target) {
    transferRuleCache[cacheKey] = {
      acceptance_status: 'accepted',
      confidence: 1.0,
      target_equiv_code: code,
    };

    return {
      accepted: true,
      electiveOnly: false,
      targetEquivCode: code,
      confidence: 1.0,
    };
  }

  // 3) Query transfer rules table using normalized columns for deterministic joins
  try {
    const { data, error } = await supabase
      .from('credit_transfer_rules')
      .select('*')
      .eq('source_institution_norm', provider)
      .eq('source_course_code_norm', code.toLowerCase())
      .eq('target_institution_norm', target)
      .maybeSingle();

    // PGRST116 = no rows; treat as "no rule"
    if (error && error.code !== 'PGRST116') {
      console.error('[TransferEngine] Query error:', error);
      // On hard errors, default to "not accepted" (fail safe)
      transferRuleCache[cacheKey] = null;
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    if (!data) {
      // No rule found - strict mode
      transferRuleCache[cacheKey] = null;
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    // Validate acceptance_status
    const validStatuses = ['accepted', 'elective', 'rejected'];
    if (!validStatuses.includes(data.acceptance_status)) {
      console.warn('[TransferEngine] Invalid acceptance_status:', data.acceptance_status);
      transferRuleCache[cacheKey] = null;
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    const entry: TransferRuleCacheEntry = {
      acceptance_status: data.acceptance_status as 'accepted' | 'elective' | 'rejected',
      target_equiv_code: data.target_course_code,
      confidence: data.confidence,
    };

    transferRuleCache[cacheKey] = entry;

    const rawConfidence = data.confidence ?? 0.5;
    const normalizedConfidence = Math.max(0, Math.min(1, rawConfidence));

    // For major requirements, only 'accepted' status counts
    // For elective/genED, both 'accepted' and 'elective' are okay
    const acceptedByStatus =
      data.acceptance_status === 'accepted' ||
      (requirementType !== 'major' && data.acceptance_status === 'elective');

    const accepted =
      acceptedByStatus && normalizedConfidence >= minConfidence;

    return {
      accepted,
      electiveOnly: data.acceptance_status === 'elective',
      targetEquivCode: data.target_course_code || undefined,
      confidence: normalizedConfidence,
    };
  } catch (err) {
    console.error('[TransferEngine] Unexpected error:', err);
    transferRuleCache[cacheKey] = null;
    return {
      accepted: false,
      electiveOnly: false,
      targetEquivCode: undefined,
      confidence: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Derive requirement type from module metadata
 * 
 * This is a heuristic based on common patterns. Projects may need to customize
 * this based on their specific module categorization.
 */
export function deriveRequirementType(module: {
  requirementKind?: string;
  category?: string;
  fulfills_area?: string;
  kind?: string;
}): 'major' | 'elective' | 'genED' {
  const kind = module.requirementKind || module.category || module.fulfills_area || module.kind || '';
  const kindUpper = kind.toUpperCase();

  // Major/Core requirements
  if (
    kindUpper.includes('MAJOR') ||
    kindUpper.includes('CORE') ||
    kindUpper.includes('REQUIRED')
  ) {
    return 'major';
  }

  // General Education
  if (
    kindUpper.includes('GEN') ||
    kindUpper.includes('GENERAL') ||
    kindUpper.includes('GENED')
  ) {
    return 'genED';
  }

  // Default to elective
  return 'elective';
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the transfer rule cache
 * Useful for testing or when transfer rules are updated
 */
export function clearTransferRuleCache(): void {
  Object.keys(transferRuleCache).forEach(key => delete transferRuleCache[key]);
}


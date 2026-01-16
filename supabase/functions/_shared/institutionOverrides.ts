/**
 * Institution Override Settings - Edge Function Helper
 * 
 * CANONICAL SOURCE OF TRUTH for override parsing/merge logic.
 * 
 * This file contains:
 * 1. Pure functions (parseOverrideSettings, mergeWithDefaults, applyTemplateStatus)
 *    - No Supabase client dependency
 *    - Can be copied verbatim to frontend if needed
 * 2. Edge-function-specific DB fetcher (getEffectiveInvariantConfig)
 * 
 * Frontend version (src/lib/invariant/institutionOverrides.ts) should import
 * the pure functions OR keep them in sync manually with CI checks.
 * 
 * @version 1.0.0
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ============================================
// PURE TYPES & CONSTANTS (NO DEPENDENCIES)
// ============================================

export const OVERRIDE_SCHEMA_VERSION = '1.0.0' as const;

export const OVERRIDE_BOUNDS = {
  unknownCreditsWarnThreshold: { min: 0, max: 60, default: 6 },
  pendingReviewThresholdMultiplier: { min: 1.0, max: 3.0, default: 1.5 },
} as const;

export interface InstitutionOverrideSettings {
  version: typeof OVERRIDE_SCHEMA_VERSION;
  unknownCreditsWarnThreshold?: number;
  unknownCreditsActiveHardZero?: boolean;
  allowMissingCapsInDraft?: boolean;
  pendingReviewThresholdMultiplier?: number;
}

export interface EffectiveInvariantConfig {
  unknownCreditsWarnThreshold: number;
  unknownCreditsActiveHardZero: boolean;
  allowMissingCapsInDraft: boolean;
  pendingReviewThresholdMultiplier: number;
  hasOverrides: boolean;
  sourceInstitution: string | null;
}

// ============================================
// PURE DEFAULTS (NO DEPENDENCIES)
// ============================================

export const DEFAULT_INVARIANT_CONFIG: Omit<EffectiveInvariantConfig, 'hasOverrides' | 'sourceInstitution'> = {
  unknownCreditsWarnThreshold: OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.default,
  unknownCreditsActiveHardZero: true,
  allowMissingCapsInDraft: false,
  pendingReviewThresholdMultiplier: OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.default,
};

// ============================================
// PURE FUNCTIONS (NO DEPENDENCIES)
// These can be copied to frontend or shared via build
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safely parse and validate override settings from JSON
 * PURE: No external dependencies
 */
export function parseOverrideSettings(
  raw: unknown
): InstitutionOverrideSettings {
  const empty: InstitutionOverrideSettings = { version: OVERRIDE_SCHEMA_VERSION };
  
  if (!raw || typeof raw !== 'object') {
    return empty;
  }
  
  const obj = raw as Record<string, unknown>;
  
  if (obj.version && obj.version !== OVERRIDE_SCHEMA_VERSION) {
    console.warn(`[institutionOverrides] Unknown schema version: ${obj.version}, using defaults`);
    return empty;
  }
  
  const result: InstitutionOverrideSettings = { version: OVERRIDE_SCHEMA_VERSION };
  
  if (typeof obj.unknownCreditsWarnThreshold === 'number') {
    result.unknownCreditsWarnThreshold = clamp(
      obj.unknownCreditsWarnThreshold,
      OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.min,
      OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.max
    );
  }
  
  if (typeof obj.unknownCreditsActiveHardZero === 'boolean') {
    result.unknownCreditsActiveHardZero = obj.unknownCreditsActiveHardZero;
  }
  
  if (typeof obj.allowMissingCapsInDraft === 'boolean') {
    result.allowMissingCapsInDraft = obj.allowMissingCapsInDraft;
  }
  
  if (typeof obj.pendingReviewThresholdMultiplier === 'number') {
    result.pendingReviewThresholdMultiplier = clamp(
      obj.pendingReviewThresholdMultiplier,
      OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.min,
      OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.max
    );
  }
  
  return result;
}

/**
 * Merge override settings with defaults
 * PURE: No external dependencies
 */
export function mergeWithDefaults(
  overrides: InstitutionOverrideSettings | null,
  institutionCode: string | null
): EffectiveInvariantConfig {
  if (!overrides) {
    return {
      ...DEFAULT_INVARIANT_CONFIG,
      hasOverrides: false,
      sourceInstitution: null,
    };
  }
  
  return {
    unknownCreditsWarnThreshold: 
      overrides.unknownCreditsWarnThreshold ?? DEFAULT_INVARIANT_CONFIG.unknownCreditsWarnThreshold,
    unknownCreditsActiveHardZero:
      overrides.unknownCreditsActiveHardZero ?? DEFAULT_INVARIANT_CONFIG.unknownCreditsActiveHardZero,
    allowMissingCapsInDraft:
      overrides.allowMissingCapsInDraft ?? DEFAULT_INVARIANT_CONFIG.allowMissingCapsInDraft,
    pendingReviewThresholdMultiplier:
      overrides.pendingReviewThresholdMultiplier ?? DEFAULT_INVARIANT_CONFIG.pendingReviewThresholdMultiplier,
    hasOverrides: true,
    sourceInstitution: institutionCode,
  };
}

/**
 * Compute effective threshold for a specific template status
 * PURE: No external dependencies
 * 
 * Use this in loops to avoid re-fetching from DB per template.
 * 
 * @param baseConfig - Config fetched once per institution (without status adjustment)
 * @param templateStatus - Actual template status (active, pending_review, etc.)
 * @returns Adjusted unknownCreditsWarnThreshold
 */
export function computeEffectiveThreshold(
  baseConfig: EffectiveInvariantConfig,
  templateStatus: string | undefined
): number {
  if (templateStatus === 'pending_review') {
    return Math.round(
      baseConfig.unknownCreditsWarnThreshold * baseConfig.pendingReviewThresholdMultiplier
    );
  }
  return baseConfig.unknownCreditsWarnThreshold;
}

// ============================================
// RAW DB ROW TYPE (for fetch result)
// ============================================

interface OverrideSettingsRowRaw {
  overrides: unknown;
  status: string;
}

// ============================================
// EDGE FUNCTION DB FETCHER
// ============================================

/**
 * Fetch RAW override settings from DB for an institution.
 * Returns parsed settings without status-specific adjustments.
 * 
 * IMPORTANT: Call this ONCE per institution per job.
 * Then use computeEffectiveThreshold() per template in loops.
 * 
 * @param supabase - Supabase client (passed from edge function)
 * @param institutionCode - Institution to fetch overrides for
 * @returns Base config WITHOUT templateStatus adjustment
 */
export async function fetchInstitutionOverridesBase(
  supabase: SupabaseClient,
  institutionCode: string
): Promise<EffectiveInvariantConfig> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('institution_override_settings')
      .select('overrides, status')
      .eq('institution_code', institutionCode)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error) {
      console.warn(`[institutionOverrides] Error fetching overrides for ${institutionCode}:`, error.message);
      return {
        ...DEFAULT_INVARIANT_CONFIG,
        hasOverrides: false,
        sourceInstitution: null,
      };
    }
    
    if (!data) {
      return {
        ...DEFAULT_INVARIANT_CONFIG,
        hasOverrides: false,
        sourceInstitution: null,
      };
    }
    
    const row = data as OverrideSettingsRowRaw;
    const parsed = parseOverrideSettings(row.overrides);
    const config = mergeWithDefaults(parsed, institutionCode);
    
    console.log(`[institutionOverrides] Fetched base config for ${institutionCode}:`, {
      unknownCreditsWarnThreshold: config.unknownCreditsWarnThreshold,
      unknownCreditsActiveHardZero: config.unknownCreditsActiveHardZero,
      hasOverrides: config.hasOverrides,
    });
    
    return config;
  } catch (err) {
    console.error(`[institutionOverrides] Failed to fetch overrides for ${institutionCode}:`, err);
    return {
      ...DEFAULT_INVARIANT_CONFIG,
      hasOverrides: false,
      sourceInstitution: null,
    };
  }
}

/**
 * Convenience wrapper that fetches and applies templateStatus in one call.
 * 
 * DEPRECATED for loops - use fetchInstitutionOverridesBase + computeEffectiveThreshold instead.
 * This is kept for simple single-template use cases.
 * 
 * @param supabase - Supabase client (passed from edge function)
 * @param params - institutionCode and optional templateStatus
 * @returns Effective config with status adjustment already applied
 */
export async function getEffectiveInvariantConfig(
  supabase: SupabaseClient,
  params: {
    institutionCode: string;
    templateStatus?: string;
  }
): Promise<EffectiveInvariantConfig> {
  const { institutionCode, templateStatus } = params;
  
  const baseConfig = await fetchInstitutionOverridesBase(supabase, institutionCode);
  
  // Apply status-specific multiplier
  if (templateStatus === 'pending_review') {
    baseConfig.unknownCreditsWarnThreshold = computeEffectiveThreshold(baseConfig, templateStatus);
  }
  
  return baseConfig;
}

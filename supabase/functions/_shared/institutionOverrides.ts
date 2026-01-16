/**
 * Institution Override Settings - Edge Function Helper
 * 
 * Edge-function-compatible version of the override config resolver.
 * This file can be imported by edge functions to fetch per-institution
 * invariant thresholds without importing browser-specific code.
 * 
 * @version 1.0.0
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ============================================
// TYPES (duplicated from frontend for edge functions)
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
// DEFAULTS
// ============================================

export const DEFAULT_INVARIANT_CONFIG: Omit<EffectiveInvariantConfig, 'hasOverrides' | 'sourceInstitution'> = {
  unknownCreditsWarnThreshold: OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.default,
  unknownCreditsActiveHardZero: true,
  allowMissingCapsInDraft: false,
  pendingReviewThresholdMultiplier: OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.default,
};

// ============================================
// PARSER
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

// ============================================
// MERGE LOGIC
// ============================================

function mergeWithDefaults(
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

// ============================================
// EDGE FUNCTION CONFIG FETCHER
// ============================================

/**
 * Fetch effective invariant configuration for an institution.
 * This is the main entry point for edge functions.
 * 
 * IMPORTANT: Call this ONCE per institution per job, then pass config down.
 * Do NOT call inside inner loops.
 * 
 * @param supabase - Supabase client (passed from edge function)
 * @param institutionCode - Institution to fetch overrides for
 * @param templateStatus - Template status for multiplier adjustment
 * @returns Effective configuration with defaults merged
 */
export async function getEffectiveInvariantConfig(
  supabase: SupabaseClient,
  params: {
    institutionCode: string;
    templateStatus?: string;
  }
): Promise<EffectiveInvariantConfig> {
  const { institutionCode, templateStatus } = params;
  
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
      // No overrides configured - use defaults
      return {
        ...DEFAULT_INVARIANT_CONFIG,
        hasOverrides: false,
        sourceInstitution: null,
      };
    }
    
    const parsed = parseOverrideSettings(data.overrides);
    const config = mergeWithDefaults(parsed, institutionCode);
    
    // Apply status-specific multiplier
    if (templateStatus === 'pending_review') {
      config.unknownCreditsWarnThreshold = Math.round(
        config.unknownCreditsWarnThreshold * config.pendingReviewThresholdMultiplier
      );
    }
    
    console.log(`[institutionOverrides] Effective config for ${institutionCode}:`, {
      unknownCreditsWarnThreshold: config.unknownCreditsWarnThreshold,
      hasOverrides: config.hasOverrides,
      templateStatus,
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

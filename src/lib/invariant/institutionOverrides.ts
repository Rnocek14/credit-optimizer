/**
 * Institution Override Settings - Frontend Module
 * 
 * This module provides CRUD operations for institution overrides.
 * It is a DUMB EDITOR/VIEWER - no computation logic.
 * 
 * CANONICAL SOURCE OF TRUTH for effective config computation:
 *    supabase/functions/_shared/institutionOverrides.ts
 * 
 * Frontend responsibilities:
 * - Display override values
 * - Validate input bounds client-side
 * - Save/disable/enable overrides via DB layer
 * - Fetch audit logs for admin UI
 * 
 * Backend (edge) responsibilities:
 * - Compute effective config from overrides
 * - Apply status-specific multipliers
 * - Enforce bounds and defaults during invariant checking
 * 
 * @version 1.0.0
 */

import {
  dbGetOverrideSettings,
  dbGetOverrideSettingsAnyStatus,
  dbUpsertOverrideSettings,
  dbUpdateOverrideStatus,
  dbInsertOverrideAudit,
  dbListOverrideAudit,
  dbListAllOverrideSettings,
  type OverrideAuditRowDb,
  type OverrideSettingsRowDb,
} from './institutionOverrides.db';

// ============================================
// TYPES (shared with edge, but defined here for UI)
// ============================================

/** Current schema version for forward compatibility */
export const OVERRIDE_SCHEMA_VERSION = '1.0.0' as const;

/** Bounded range constraints for numeric overrides (for UI validation) */
export const OVERRIDE_BOUNDS = {
  unknownCreditsWarnThreshold: { min: 0, max: 60, default: 6 },
  pendingReviewThresholdMultiplier: { min: 1.0, max: 3.0, default: 1.5 },
} as const;

/**
 * Institution override settings shape (versioned)
 * All fields are optional - missing means "use default"
 */
export interface InstitutionOverrideSettings {
  version: typeof OVERRIDE_SCHEMA_VERSION;
  unknownCreditsWarnThreshold?: number;
  unknownCreditsActiveHardZero?: boolean;
  allowMissingCapsInDraft?: boolean;
  pendingReviewThresholdMultiplier?: number;
}

/**
 * Database row shape with parsed overrides
 */
export interface InstitutionOverrideRow {
  id: string;
  institution_code: string;
  overrides: InstitutionOverrideSettings;
  status: 'active' | 'disabled';
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Audit log entry shape
 */
export interface InstitutionOverrideAuditEntry {
  id: string;
  institution_code: string;
  action: 'create' | 'update' | 'disable' | 'enable';
  old_overrides: InstitutionOverrideSettings | null;
  new_overrides: InstitutionOverrideSettings | null;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
}

/**
 * Effective invariant configuration (returned by edge functions)
 * Frontend does NOT compute this - edge is source of truth
 */
export interface EffectiveInvariantConfig {
  unknownCreditsWarnThreshold: number;
  unknownCreditsActiveHardZero: boolean;
  allowMissingCapsInDraft: boolean;
  pendingReviewThresholdMultiplier: number;
  hasOverrides: boolean;
  sourceInstitution: string | null;
}

// ============================================
// DEFAULT VALUES (for UI display only)
// ============================================

export const DEFAULT_INVARIANT_CONFIG: Omit<EffectiveInvariantConfig, 'hasOverrides' | 'sourceInstitution'> = {
  unknownCreditsWarnThreshold: OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.default,
  unknownCreditsActiveHardZero: true,
  allowMissingCapsInDraft: false,
  pendingReviewThresholdMultiplier: OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.default,
};

// ============================================
// SIMPLE PARSE (for display, not computation)
// ============================================

/**
 * Parse override settings from raw JSON for display
 * NOTE: This is for UI display only. Edge computes effective config.
 */
export function parseOverrideSettings(raw: unknown): InstitutionOverrideSettings {
  const empty: InstitutionOverrideSettings = { version: OVERRIDE_SCHEMA_VERSION };
  
  if (!raw || typeof raw !== 'object') {
    return empty;
  }
  
  const obj = raw as Record<string, unknown>;
  
  // Version check
  const version = obj.version;
  if (version && version !== OVERRIDE_SCHEMA_VERSION) {
    console.warn(`Unknown override schema version: ${version}, displaying as-is`);
  }
  
  return {
    version: OVERRIDE_SCHEMA_VERSION,
    unknownCreditsWarnThreshold: typeof obj.unknownCreditsWarnThreshold === 'number' 
      ? obj.unknownCreditsWarnThreshold : undefined,
    unknownCreditsActiveHardZero: typeof obj.unknownCreditsActiveHardZero === 'boolean'
      ? obj.unknownCreditsActiveHardZero : undefined,
    allowMissingCapsInDraft: typeof obj.allowMissingCapsInDraft === 'boolean'
      ? obj.allowMissingCapsInDraft : undefined,
    pendingReviewThresholdMultiplier: typeof obj.pendingReviewThresholdMultiplier === 'number'
      ? obj.pendingReviewThresholdMultiplier : undefined,
  };
}

/**
 * Serialize override settings for database storage
 */
export function serializeOverrideSettings(
  settings: Partial<InstitutionOverrideSettings>
): InstitutionOverrideSettings {
  return {
    version: OVERRIDE_SCHEMA_VERSION,
    ...settings,
  };
}

// ============================================
// DEPRECATED - Use edge function for computation
// ============================================

/**
 * @deprecated Frontend should not compute effective config.
 * This is kept for backwards compatibility but always returns defaults.
 * Edge functions are the source of truth.
 */
export function mergeWithDefaults(
  _overrides: InstitutionOverrideSettings | null,
  _institutionCode: string | null
): EffectiveInvariantConfig {
  console.warn('[DEPRECATED] mergeWithDefaults called on frontend. Use edge function for effective config.');
  return {
    ...DEFAULT_INVARIANT_CONFIG,
    hasOverrides: false,
    sourceInstitution: null,
  };
}

/**
 * @deprecated Frontend should not compute effective config.
 */
export async function getEffectiveInvariantConfig(_params: {
  institutionCode: string;
  templateStatus?: string;
}): Promise<EffectiveInvariantConfig> {
  console.warn('[DEPRECATED] getEffectiveInvariantConfig called on frontend. Use edge function.');
  return {
    ...DEFAULT_INVARIANT_CONFIG,
    hasOverrides: false,
    sourceInstitution: null,
  };
}

/**
 * @deprecated Frontend should not compute effective config.
 */
export function getEffectiveInvariantConfigSync(_params: {
  institutionCode: string | null;
  templateStatus?: string;
  overrides?: InstitutionOverrideSettings | null;
}): EffectiveInvariantConfig {
  console.warn('[DEPRECATED] getEffectiveInvariantConfigSync called on frontend. Use edge function.');
  return {
    ...DEFAULT_INVARIANT_CONFIG,
    hasOverrides: false,
    sourceInstitution: null,
  };
}

// ============================================
// CACHE (for fetch operations)
// ============================================

const overrideCache = new Map<string, { data: InstitutionOverrideSettings | null; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached(institutionCode: string): InstitutionOverrideSettings | null | undefined {
  const entry = overrideCache.get(institutionCode);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    overrideCache.delete(institutionCode);
    return undefined;
  }
  return entry.data;
}

function setCache(institutionCode: string, data: InstitutionOverrideSettings | null): void {
  overrideCache.set(institutionCode, {
    data,
    expiry: Date.now() + CACHE_TTL_MS,
  });
}

export function clearOverrideCache(institutionCode?: string): void {
  if (institutionCode) {
    overrideCache.delete(institutionCode);
  } else {
    overrideCache.clear();
  }
}

// ============================================
// DATA ACCESS (for Admin UI)
// ============================================

/**
 * Fetch override settings for display
 */
export async function fetchInstitutionOverrides(
  institutionCode: string
): Promise<InstitutionOverrideSettings | null> {
  const cached = getCached(institutionCode);
  if (cached !== undefined) {
    return cached;
  }
  
  const { data, error } = await dbGetOverrideSettings(institutionCode);
  
  if (error) {
    console.error('Error fetching institution overrides:', error.message);
    return null;
  }
  
  if (!data) {
    setCache(institutionCode, null);
    return null;
  }
  
  const parsed = parseOverrideSettings(data.overrides);
  setCache(institutionCode, parsed);
  return parsed;
}

// ============================================
// MUTATION HELPERS
// ============================================

function logAuditFailure(
  institutionCode: string,
  action: string,
  reason: string | null,
  error: Error
): void {
  console.warn('[OVERRIDE_AUDIT_FAILED]', {
    institutionCode,
    action,
    reason,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
}

export async function saveInstitutionOverrides(params: {
  institutionCode: string;
  settings: Partial<InstitutionOverrideSettings>;
  reason: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { institutionCode, settings, reason, userId } = params;
  
  try {
    const { data: existing, error: fetchError } = await dbGetOverrideSettingsAnyStatus(institutionCode);
    
    if (fetchError) {
      console.error('Error fetching existing overrides:', fetchError.message);
    }
    
    const newOverrides = serializeOverrideSettings(settings);
    const action = existing ? 'update' : 'create';
    
    const { error: upsertError } = await dbUpsertOverrideSettings({
      institution_code: institutionCode,
      overrides: newOverrides as unknown as Record<string, unknown>,
      status: 'active',
      updated_by: userId,
    });
    
    if (upsertError) {
      return { success: false, error: upsertError.message };
    }
    
    const { error: auditError } = await dbInsertOverrideAudit({
      institution_code: institutionCode,
      action,
      old_overrides: existing?.overrides as Record<string, unknown> | null ?? null,
      new_overrides: newOverrides as unknown as Record<string, unknown>,
      reason,
      actor_user_id: userId,
    });
    
    if (auditError) {
      logAuditFailure(institutionCode, action, reason, auditError);
    }
    
    clearOverrideCache(institutionCode);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function disableInstitutionOverrides(params: {
  institutionCode: string;
  reason: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { institutionCode, reason, userId } = params;
  
  try {
    const { data: existing, error: fetchError } = await dbGetOverrideSettingsAnyStatus(institutionCode);
    
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    if (!existing) {
      return { success: false, error: 'No override settings found' };
    }
    
    const { error: updateError } = await dbUpdateOverrideStatus(
      institutionCode,
      'disabled',
      userId
    );
    
    if (updateError) {
      return { success: false, error: updateError.message };
    }
    
    const { error: auditError } = await dbInsertOverrideAudit({
      institution_code: institutionCode,
      action: 'disable',
      old_overrides: existing.overrides as Record<string, unknown>,
      new_overrides: null,
      reason,
      actor_user_id: userId,
    });
    
    if (auditError) {
      logAuditFailure(institutionCode, 'disable', reason, auditError);
    }
    
    clearOverrideCache(institutionCode);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================
// AUDIT LOG ACCESS
// ============================================

export async function fetchOverrideAuditLog(
  institutionCode: string,
  limit = 50
): Promise<InstitutionOverrideAuditEntry[]> {
  const { data, error } = await dbListOverrideAudit(institutionCode, limit);
  
  if (error) {
    console.error('Error fetching audit log:', error.message);
    return [];
  }
  
  return (data ?? []).map((row: OverrideAuditRowDb) => ({
    id: row.id,
    institution_code: row.institution_code,
    action: row.action as 'create' | 'update' | 'disable' | 'enable',
    old_overrides: row.old_overrides ? parseOverrideSettings(row.old_overrides) : null,
    new_overrides: row.new_overrides ? parseOverrideSettings(row.new_overrides) : null,
    reason: row.reason,
    actor_user_id: row.actor_user_id,
    created_at: row.created_at,
  }));
}

export async function fetchAllInstitutionOverrides(): Promise<InstitutionOverrideRow[]> {
  const { data, error } = await dbListAllOverrideSettings();
  
  if (error) {
    console.error('Error fetching all overrides:', error.message);
    return [];
  }
  
  return (data ?? []).map((row: OverrideSettingsRowDb) => ({
    id: row.id,
    institution_code: row.institution_code,
    overrides: parseOverrideSettings(row.overrides),
    status: row.status as 'active' | 'disabled',
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    created_at: row.created_at,
  }));
}

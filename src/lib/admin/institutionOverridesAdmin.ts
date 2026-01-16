/**
 * Institution Override Settings - Admin CRUD Module
 * 
 * This module provides CRUD operations for institution overrides.
 * It is a DUMB EDITOR/VIEWER - NO computation logic.
 * 
 * CANONICAL SOURCE OF TRUTH for effective config computation:
 *    supabase/functions/_shared/institutionOverrides.ts
 * 
 * Frontend (this module) responsibilities:
 * - Display override values as stored (lossless)
 * - Validate input bounds client-side before save
 * - Save/disable/enable overrides via DB layer
 * - Fetch audit logs for admin UI
 * 
 * Backend (edge) responsibilities:
 * - Compute effective config from overrides
 * - Apply status-specific multipliers
 * - Clamp values and enforce bounds
 * - Enforce defaults during invariant checking
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
} from '../invariant/institutionOverrides.db';

// ============================================
// TYPES (for UI display only)
// ============================================

/** Current schema version - for reference when creating new overrides */
export const OVERRIDE_SCHEMA_VERSION = '1.0.0' as const;

/** Bounded range constraints for UI validation (edge enforces these too) */
export const OVERRIDE_BOUNDS = {
  unknownCreditsWarnThreshold: { min: 0, max: 60, default: 6 },
  pendingReviewThresholdMultiplier: { min: 1.0, max: 3.0, default: 1.5 },
} as const;

/**
 * Institution override settings shape (UI version)
 * - version is preserved as-is from storage (may differ from current schema)
 * - all fields optional
 * - NO clamping or defaulting - display what's stored
 */
export interface InstitutionOverrideSettingsUi {
  /** Schema version as stored (may be older/newer than current) */
  version?: string;
  unknownCreditsWarnThreshold?: number;
  unknownCreditsActiveHardZero?: boolean;
  allowMissingCapsInDraft?: boolean;
  pendingReviewThresholdMultiplier?: number;
  /** Passthrough for any unknown keys (forward compat) */
  [key: string]: unknown;
}

/**
 * Database row shape with parsed overrides
 */
export interface InstitutionOverrideRow {
  id: string;
  institution_code: string;
  overrides: InstitutionOverrideSettingsUi;
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
  old_overrides: InstitutionOverrideSettingsUi | null;
  new_overrides: InstitutionOverrideSettingsUi | null;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
}

/** Default values for UI display (informational only - edge enforces) */
export const UI_DEFAULTS = {
  unknownCreditsWarnThreshold: OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.default,
  unknownCreditsActiveHardZero: true,
  allowMissingCapsInDraft: false,
  pendingReviewThresholdMultiplier: OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.default,
} as const;

// ============================================
// LOSSLESS PARSE (for display, preserves as-is)
// ============================================

/**
 * Parse override settings from raw JSON for DISPLAY ONLY
 * 
 * This is LOSSLESS:
 * - Preserves version as stored (even if different from current schema)
 * - Does NOT clamp values
 * - Does NOT apply defaults
 * - Preserves unknown keys for forward compatibility
 * 
 * Edge functions handle clamping/defaults during computation.
 */
export function parseOverrideSettingsForDisplay(raw: unknown): InstitutionOverrideSettingsUi {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  
  const obj = raw as Record<string, unknown>;
  const result: InstitutionOverrideSettingsUi = {};
  
  // Preserve version exactly as stored
  if (obj.version !== undefined) {
    result.version = String(obj.version);
  }
  
  // Extract known fields with type coercion only (no clamping)
  if (typeof obj.unknownCreditsWarnThreshold === 'number') {
    result.unknownCreditsWarnThreshold = obj.unknownCreditsWarnThreshold;
  }
  
  if (typeof obj.unknownCreditsActiveHardZero === 'boolean') {
    result.unknownCreditsActiveHardZero = obj.unknownCreditsActiveHardZero;
  }
  
  if (typeof obj.allowMissingCapsInDraft === 'boolean') {
    result.allowMissingCapsInDraft = obj.allowMissingCapsInDraft;
  }
  
  if (typeof obj.pendingReviewThresholdMultiplier === 'number') {
    result.pendingReviewThresholdMultiplier = obj.pendingReviewThresholdMultiplier;
  }
  
  // Passthrough unknown keys for forward compatibility display
  for (const key of Object.keys(obj)) {
    if (!(key in result)) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Serialize override settings for database storage
 * Adds current schema version
 */
export function serializeOverrideSettings(
  settings: Partial<InstitutionOverrideSettingsUi>
): InstitutionOverrideSettingsUi {
  return {
    version: OVERRIDE_SCHEMA_VERSION,
    ...settings,
  };
}

/**
 * Validate settings before save (client-side bounds check)
 * Returns null if valid, error message if invalid
 */
export function validateOverrideSettings(
  settings: Partial<InstitutionOverrideSettingsUi>
): string | null {
  const { unknownCreditsWarnThreshold, pendingReviewThresholdMultiplier } = settings;
  
  if (unknownCreditsWarnThreshold !== undefined) {
    const bounds = OVERRIDE_BOUNDS.unknownCreditsWarnThreshold;
    if (unknownCreditsWarnThreshold < bounds.min || unknownCreditsWarnThreshold > bounds.max) {
      return `Unknown credits threshold must be between ${bounds.min} and ${bounds.max}`;
    }
  }
  
  if (pendingReviewThresholdMultiplier !== undefined) {
    const bounds = OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier;
    if (pendingReviewThresholdMultiplier < bounds.min || pendingReviewThresholdMultiplier > bounds.max) {
      return `Pending review multiplier must be between ${bounds.min} and ${bounds.max}`;
    }
  }
  
  return null;
}

// ============================================
// CACHE (for fetch operations)
// ============================================

const overrideCache = new Map<string, { data: InstitutionOverrideSettingsUi | null; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached(institutionCode: string): InstitutionOverrideSettingsUi | null | undefined {
  const entry = overrideCache.get(institutionCode);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    overrideCache.delete(institutionCode);
    return undefined;
  }
  return entry.data;
}

function setCache(institutionCode: string, data: InstitutionOverrideSettingsUi | null): void {
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
): Promise<InstitutionOverrideSettingsUi | null> {
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
  
  const parsed = parseOverrideSettingsForDisplay(data.overrides);
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
  settings: Partial<InstitutionOverrideSettingsUi>;
  reason: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { institutionCode, settings, reason, userId } = params;
  
  // Client-side validation
  const validationError = validateOverrideSettings(settings);
  if (validationError) {
    return { success: false, error: validationError };
  }
  
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
    old_overrides: row.old_overrides ? parseOverrideSettingsForDisplay(row.old_overrides) : null,
    new_overrides: row.new_overrides ? parseOverrideSettingsForDisplay(row.new_overrides) : null,
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
    overrides: parseOverrideSettingsForDisplay(row.overrides),
    status: row.status as 'active' | 'disabled',
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    created_at: row.created_at,
  }));
}

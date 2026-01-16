/**
 * Institution Override Settings
 * 
 * Per-institution configuration overrides for invariant thresholds and gates.
 * 
 * Design principles:
 * - BOUNDED: Can only relax/tighten specific thresholds, not disable invariants
 * - AUDIT-LOGGED: Every change is recorded with who/when/why
 * - DASHBOARD-SAFE: Distinct codes stay distinct; overrides adjust thresholds only
 * - NON-FORKING: Apply overrides as config inputs, not duplicate logic
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
// TYPES
// ============================================

/** Current schema version for forward compatibility */
export const OVERRIDE_SCHEMA_VERSION = '1.0.0' as const;

/** Bounded range constraints for numeric overrides */
export const OVERRIDE_BOUNDS = {
  unknownCreditsWarnThreshold: { min: 0, max: 60, default: 6 },
  pendingReviewThresholdMultiplier: { min: 1.0, max: 3.0, default: 1.5 },
} as const;

/**
 * Institution override settings shape (versioned)
 * 
 * All fields are optional - missing means "use default"
 */
export interface InstitutionOverrideSettings {
  /** Schema version for forward compatibility */
  version: typeof OVERRIDE_SCHEMA_VERSION;
  
  /**
   * Warning threshold for unknown credits (in credit hours)
   * If unknown credits exceed this, trigger INV_UNKNOWN_CREDITS_EXCEEDS_THRESHOLD warning
   * Bounded: 0-60 credits
   * Default: 6
   */
  unknownCreditsWarnThreshold?: number;
  
  /**
   * Whether active templates require unknown credits = 0
   * If true, INV_UNKNOWN_CREDITS_NONZERO_ACTIVE is enforced as hard error
   * Default: true
   */
  unknownCreditsActiveHardZero?: boolean;
  
  /**
   * Whether to allow missing cap configurations in draft/pending_review status
   * If true, INV_POLICY_MISSING_*_CAP only fires for active templates
   * Default: false
   */
  allowMissingCapsInDraft?: boolean;
  
  /**
   * Whether to allow higher unknown credits threshold for pending_review
   * Multiplier applied to unknownCreditsWarnThreshold for pending_review templates
   * Bounded: 1.0-3.0
   * Default: 1.5
   */
  pendingReviewThresholdMultiplier?: number;
}

/**
 * Database row shape (re-exported from DB layer with parsed overrides)
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
 * Effective invariant configuration (after merging overrides with defaults)
 */
export interface EffectiveInvariantConfig {
  /** Resolved warning threshold for unknown credits */
  unknownCreditsWarnThreshold: number;
  
  /** Whether active templates require unknown credits = 0 */
  unknownCreditsActiveHardZero: boolean;
  
  /** Whether missing caps are allowed in draft/pending_review */
  allowMissingCapsInDraft: boolean;
  
  /** Multiplier for pending_review threshold */
  pendingReviewThresholdMultiplier: number;
  
  /** Whether overrides were applied (vs pure defaults) */
  hasOverrides: boolean;
  
  /** Source institution code (if overrides applied) */
  sourceInstitution: string | null;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_INVARIANT_CONFIG: Omit<EffectiveInvariantConfig, 'hasOverrides' | 'sourceInstitution'> = {
  unknownCreditsWarnThreshold: OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.default,
  unknownCreditsActiveHardZero: true,
  allowMissingCapsInDraft: false,
  pendingReviewThresholdMultiplier: OVERRIDE_BOUNDS.pendingReviewThresholdMultiplier.default,
};

// ============================================
// PARSER & VALIDATOR
// ============================================

/**
 * Clamp a number to a bounded range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safely parse and validate override settings from JSON
 * 
 * - Validates version
 * - Clamps numeric thresholds into safe bounds
 * - Ignores unknown keys (forward compatible)
 * - Returns empty object if invalid
 */
export function parseOverrideSettings(
  raw: unknown
): InstitutionOverrideSettings {
  // Default empty settings
  const empty: InstitutionOverrideSettings = { version: OVERRIDE_SCHEMA_VERSION };
  
  if (!raw || typeof raw !== 'object') {
    return empty;
  }
  
  const obj = raw as Record<string, unknown>;
  
  // Version check (allow missing for backwards compat, but normalize)
  const version = obj.version;
  if (version && version !== OVERRIDE_SCHEMA_VERSION) {
    // Future: could add migration logic here
    console.warn(`Unknown override schema version: ${version}, using defaults`);
    return empty;
  }
  
  const result: InstitutionOverrideSettings = { version: OVERRIDE_SCHEMA_VERSION };
  
  // unknownCreditsWarnThreshold
  if (typeof obj.unknownCreditsWarnThreshold === 'number') {
    result.unknownCreditsWarnThreshold = clamp(
      obj.unknownCreditsWarnThreshold,
      OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.min,
      OVERRIDE_BOUNDS.unknownCreditsWarnThreshold.max
    );
  }
  
  // unknownCreditsActiveHardZero
  if (typeof obj.unknownCreditsActiveHardZero === 'boolean') {
    result.unknownCreditsActiveHardZero = obj.unknownCreditsActiveHardZero;
  }
  
  // allowMissingCapsInDraft
  if (typeof obj.allowMissingCapsInDraft === 'boolean') {
    result.allowMissingCapsInDraft = obj.allowMissingCapsInDraft;
  }
  
  // pendingReviewThresholdMultiplier
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
// EFFECTIVE CONFIG RESOLVER
// ============================================

/**
 * Merge override settings with defaults to get effective config
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

// ============================================
// CACHE (simple in-memory, short TTL)
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

/**
 * Clear cache for an institution (call after updates)
 */
export function clearOverrideCache(institutionCode?: string): void {
  if (institutionCode) {
    overrideCache.delete(institutionCode);
  } else {
    overrideCache.clear();
  }
}

// ============================================
// DATA ACCESS
// ============================================

/**
 * Fetch override settings for an institution
 * Returns null if no overrides configured or disabled
 */
export async function fetchInstitutionOverrides(
  institutionCode: string
): Promise<InstitutionOverrideSettings | null> {
  // Check cache first
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

/**
 * Get effective invariant configuration for an institution
 * This is the main entry point for invariant checkers
 */
export async function getEffectiveInvariantConfig(params: {
  institutionCode: string;
  templateStatus?: string;
}): Promise<EffectiveInvariantConfig> {
  const { institutionCode, templateStatus } = params;
  
  const overrides = await fetchInstitutionOverrides(institutionCode);
  const config = mergeWithDefaults(overrides, institutionCode);
  
  // Apply status-specific adjustments
  if (templateStatus === 'pending_review') {
    // Use multiplier for pending_review threshold
    config.unknownCreditsWarnThreshold = Math.round(
      config.unknownCreditsWarnThreshold * config.pendingReviewThresholdMultiplier
    );
  }
  
  return config;
}

/**
 * Synchronous version for when you already have the overrides loaded
 */
export function getEffectiveInvariantConfigSync(params: {
  institutionCode: string | null;
  templateStatus?: string;
  overrides?: InstitutionOverrideSettings | null;
}): EffectiveInvariantConfig {
  const { institutionCode, templateStatus, overrides } = params;
  
  const config = mergeWithDefaults(overrides ?? null, institutionCode);
  
  // Apply status-specific adjustments
  if (templateStatus === 'pending_review') {
    config.unknownCreditsWarnThreshold = Math.round(
      config.unknownCreditsWarnThreshold * config.pendingReviewThresholdMultiplier
    );
  }
  
  return config;
}

// ============================================
// MUTATION HELPERS
// ============================================

/**
 * Log audit failure with distinct warning for telemetry
 */
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

/**
 * Save override settings for an institution
 * Automatically creates audit log entry
 */
export async function saveInstitutionOverrides(params: {
  institutionCode: string;
  settings: Partial<InstitutionOverrideSettings>;
  reason: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { institutionCode, settings, reason, userId } = params;
  
  try {
    // Fetch existing settings
    const { data: existing, error: fetchError } = await dbGetOverrideSettingsAnyStatus(institutionCode);
    
    if (fetchError) {
      console.error('Error fetching existing overrides:', fetchError.message);
    }
    
    const newOverrides = serializeOverrideSettings(settings);
    const action = existing ? 'update' : 'create';
    
    // Upsert settings
    const { error: upsertError } = await dbUpsertOverrideSettings({
      institution_code: institutionCode,
      overrides: newOverrides as unknown as Record<string, unknown>,
      status: 'active',
      updated_by: userId,
    });
    
    if (upsertError) {
      return { success: false, error: upsertError.message };
    }
    
    // Create audit entry
    const { error: auditError } = await dbInsertOverrideAudit({
      institution_code: institutionCode,
      action,
      old_overrides: existing?.overrides as Record<string, unknown> | null ?? null,
      new_overrides: newOverrides as unknown as Record<string, unknown>,
      reason,
      actor_user_id: userId,
    });
    
    if (auditError) {
      // Log but don't fail the operation
      logAuditFailure(institutionCode, action, reason, auditError);
    }
    
    // Clear cache
    clearOverrideCache(institutionCode);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Disable overrides for an institution
 */
export async function disableInstitutionOverrides(params: {
  institutionCode: string;
  reason: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { institutionCode, reason, userId } = params;
  
  try {
    // Fetch existing settings
    const { data: existing, error: fetchError } = await dbGetOverrideSettingsAnyStatus(institutionCode);
    
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    if (!existing) {
      return { success: false, error: 'No override settings found' };
    }
    
    // Update status to disabled
    const { error: updateError } = await dbUpdateOverrideStatus(
      institutionCode,
      'disabled',
      userId
    );
    
    if (updateError) {
      return { success: false, error: updateError.message };
    }
    
    // Create audit entry
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
    
    // Clear cache
    clearOverrideCache(institutionCode);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch audit log for an institution
 */
export async function fetchOverrideAuditLog(
  institutionCode: string,
  limit = 50
): Promise<InstitutionOverrideAuditEntry[]> {
  const { data, error } = await dbListOverrideAudit(institutionCode, limit);
  
  if (error) {
    console.error('Error fetching audit log:', error.message);
    return [];
  }
  
  // Transform DB rows to typed entries
  return data.map((row: OverrideAuditRowDb): InstitutionOverrideAuditEntry => ({
    id: row.id,
    institution_code: row.institution_code,
    action: row.action,
    old_overrides: row.old_overrides ? parseOverrideSettings(row.old_overrides) : null,
    new_overrides: row.new_overrides ? parseOverrideSettings(row.new_overrides) : null,
    reason: row.reason,
    actor_user_id: row.actor_user_id,
    created_at: row.created_at,
  }));
}

/**
 * Fetch all institutions with overrides configured
 */
export async function fetchAllInstitutionOverrides(): Promise<InstitutionOverrideRow[]> {
  const { data, error } = await dbListAllOverrideSettings();
  
  if (error) {
    console.error('Error fetching all overrides:', error.message);
    return [];
  }
  
  // Transform DB rows to typed entries
  return data.map((row: OverrideSettingsRowDb): InstitutionOverrideRow => ({
    id: row.id,
    institution_code: row.institution_code,
    overrides: parseOverrideSettings(row.overrides),
    status: row.status,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    created_at: row.created_at,
  }));
}

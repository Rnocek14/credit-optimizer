/**
 * Institution Overrides Database Layer
 * 
 * Typed wrapper functions for institution override tables.
 * Localizes the "missing generated types" problem to this file only.
 * 
 * NOTE: These tables were added via migration but types may not be regenerated yet.
 * All `any` casts are intentionally localized to this file to prevent bleed.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// LOCAL DB ROW TYPES
// ============================================

/** Database row shape for institution_override_settings */
export interface OverrideSettingsRowDb {
  id: string;
  institution_code: string;
  overrides: unknown; // jsonb - will be parsed by caller
  status: 'active' | 'disabled';
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/** Database row shape for institution_override_audit */
export interface OverrideAuditRowDb {
  id: string;
  institution_code: string;
  action: 'create' | 'update' | 'disable' | 'enable';
  old_overrides: unknown | null; // jsonb
  new_overrides: unknown | null; // jsonb
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
}

/** Input for upserting settings */
export interface UpsertSettingsInput {
  institution_code: string;
  overrides: Record<string, unknown>;
  status: 'active' | 'disabled';
  updated_by: string;
}

/** Input for inserting audit entry */
export interface InsertAuditInput {
  institution_code: string;
  action: 'create' | 'update' | 'disable' | 'enable';
  old_overrides: Record<string, unknown> | null;
  new_overrides: Record<string, unknown> | null;
  reason: string | null;
  actor_user_id: string | null;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

// Table names - localized constants
const SETTINGS_TABLE = 'institution_override_settings';
const AUDIT_TABLE = 'institution_override_audit';

/**
 * Get the supabase client with table access for untyped tables
 * All `any` usage is localized to this helper
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(tableName: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(tableName);
}

/**
 * Fetch override settings for a specific institution (active only)
 */
export async function dbGetOverrideSettings(
  institutionCode: string
): Promise<{ data: OverrideSettingsRowDb | null; error: Error | null }> {
  try {
    const { data, error } = await getTable(SETTINGS_TABLE)
      .select('id, institution_code, overrides, status, updated_by, updated_at, created_at')
      .eq('institution_code', institutionCode)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as OverrideSettingsRowDb | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch override settings by institution code (any status)
 */
export async function dbGetOverrideSettingsAnyStatus(
  institutionCode: string
): Promise<{ data: OverrideSettingsRowDb | null; error: Error | null }> {
  try {
    const { data, error } = await getTable(SETTINGS_TABLE)
      .select('id, institution_code, overrides, status, updated_by, updated_at, created_at')
      .eq('institution_code', institutionCode)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as OverrideSettingsRowDb | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Upsert override settings
 */
export async function dbUpsertOverrideSettings(
  input: UpsertSettingsInput
): Promise<{ error: Error | null }> {
  try {
    const { error } = await getTable(SETTINGS_TABLE)
      .upsert(
        {
          institution_code: input.institution_code,
          overrides: input.overrides,
          status: input.status,
          updated_by: input.updated_by,
        },
        { onConflict: 'institution_code' }
      );

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update override settings status
 */
export async function dbUpdateOverrideStatus(
  institutionCode: string,
  status: 'active' | 'disabled',
  updatedBy: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await getTable(SETTINGS_TABLE)
      .update({
        status,
        updated_by: updatedBy,
      })
      .eq('institution_code', institutionCode);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Insert audit log entry
 */
export async function dbInsertOverrideAudit(
  input: InsertAuditInput
): Promise<{ error: Error | null }> {
  try {
    const { error } = await getTable(AUDIT_TABLE)
      .insert({
        institution_code: input.institution_code,
        action: input.action,
        old_overrides: input.old_overrides,
        new_overrides: input.new_overrides,
        reason: input.reason,
        actor_user_id: input.actor_user_id,
      });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch audit log for an institution
 */
export async function dbListOverrideAudit(
  institutionCode: string,
  limit = 50
): Promise<{ data: OverrideAuditRowDb[]; error: Error | null }> {
  try {
    const { data, error } = await getTable(AUDIT_TABLE)
      .select('id, institution_code, action, old_overrides, new_overrides, reason, actor_user_id, created_at')
      .eq('institution_code', institutionCode)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []) as OverrideAuditRowDb[], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch all institutions with overrides configured
 */
export async function dbListAllOverrideSettings(): Promise<{ 
  data: OverrideSettingsRowDb[]; 
  error: Error | null 
}> {
  try {
    const { data, error } = await getTable(SETTINGS_TABLE)
      .select('id, institution_code, overrides, status, updated_by, updated_at, created_at')
      .order('institution_code');

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []) as OverrideSettingsRowDb[], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

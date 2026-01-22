/**
 * V1 Institution Scope Configuration (Backend/Edge Functions)
 * 
 * NOW DATABASE-DRIVEN: Queries institution_v1_scope table instead of hardcoded list.
 * 
 * This file provides:
 * - Database-backed V1 scope checks for edge functions
 * - Fallback to hardcoded list if database unavailable
 * - Consistent with frontend: src/lib/degree/v1Scope.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Fallback list used when database is unavailable
 * Keep in sync with initial seed in migration
 */
const FALLBACK_V1_INSTITUTIONS: string[] = ['TESU', 'COSC', 'WGU', 'EXCELSIOR', 'EMPIRE'];

/**
 * Check if an institution is in V1 scope (database-backed)
 * Handles case normalization and whitespace trimming
 * 
 * @param institutionCode - The institution code to check
 * @param supabaseClient - Optional Supabase client (creates one if not provided)
 */
export async function isV1InstitutionAsync(
  institutionCode: string | null | undefined,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<boolean> {
  if (!institutionCode) return false;
  const normalized = institutionCode.toUpperCase().trim();
  
  try {
    const client = supabaseClient ?? createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data, error } = await client
      .from('institution_v1_scope')
      .select('institution_code')
      .eq('institution_code', normalized)
      .maybeSingle();
    
    if (error) {
      console.warn('V1 scope check failed, using fallback:', error.message);
      return FALLBACK_V1_INSTITUTIONS.includes(normalized);
    }
    
    return data !== null;
  } catch (err) {
    console.warn('V1 scope check error, using fallback:', err);
    return FALLBACK_V1_INSTITUTIONS.includes(normalized);
  }
}

/**
 * Synchronous check using fallback list only
 * Use for immediate decisions when database isn't available
 * @deprecated Prefer isV1InstitutionAsync for accurate checks
 */
export function isV1Institution(institutionCode: string | null | undefined): boolean {
  if (!institutionCode) return false;
  const normalized = institutionCode.toUpperCase().trim();
  return FALLBACK_V1_INSTITUTIONS.includes(normalized);
}

/**
 * Get all V1 institutions from database
 */
export async function getV1InstitutionsFromDB(
  supabaseClient?: ReturnType<typeof createClient>
): Promise<string[]> {
  try {
    const client = supabaseClient ?? createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data, error } = await client
      .from('institution_v1_scope')
      .select('institution_code')
      .order('enabled_at', { ascending: true });
    
    if (error) {
      console.warn('Failed to fetch V1 institutions, using fallback:', error.message);
      return [...FALLBACK_V1_INSTITUTIONS];
    }
    
    return (data ?? []).map((row: { institution_code: string }) => row.institution_code);
  } catch (err) {
    console.warn('V1 institutions fetch error, using fallback:', err);
    return [...FALLBACK_V1_INSTITUTIONS];
  }
}

/**
 * Get human-readable list of V1 institutions (for error messages)
 * Uses fallback list for synchronous access
 */
export function getV1InstitutionsList(): string {
  return FALLBACK_V1_INSTITUTIONS.join(', ');
}

/**
 * Legacy exports for backward compatibility
 */
export const V1_ALLOWED_INSTITUTIONS_LIST = FALLBACK_V1_INSTITUTIONS;
export const V1_ALLOWED_INSTITUTIONS = new Set<string>(FALLBACK_V1_INSTITUTIONS);

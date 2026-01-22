/**
 * V1 Institution Scope Configuration (Frontend)
 * 
 * NOW DATABASE-DRIVEN: Queries institution_v1_scope table instead of hardcoded list.
 * 
 * This file provides:
 * - Async functions to check V1 scope from database
 * - Cached query hook for React components
 * - Fallback to hardcoded list if database unavailable
 * 
 * Backend sync: supabase/functions/_shared/v1Scope.ts uses same table
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Fallback list used when database is unavailable
 * Keep in sync with initial seed in migration
 */
const FALLBACK_V1_INSTITUTIONS: string[] = ['TESU', 'COSC', 'WGU', 'EXCELSIOR', 'EMPIRE'];

// Cache for V1 institutions (refreshed periodically)
let v1InstitutionsCache: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch V1 institutions from database
 * Returns Set for O(1) lookup
 */
async function fetchV1Institutions(): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('institution_v1_scope')
      .select('institution_code');
    
    if (error) {
      console.warn('Failed to fetch V1 scope from database, using fallback:', error.message);
      return new Set(FALLBACK_V1_INSTITUTIONS);
    }
    
    const institutions = (data ?? []).map(row => row.institution_code.toUpperCase());
    return new Set(institutions);
  } catch (err) {
    console.warn('V1 scope fetch error, using fallback:', err);
    return new Set(FALLBACK_V1_INSTITUTIONS);
  }
}

/**
 * Get cached V1 institutions (refreshes if stale)
 */
async function getV1InstitutionsSet(): Promise<Set<string>> {
  const now = Date.now();
  
  if (v1InstitutionsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return v1InstitutionsCache;
  }
  
  v1InstitutionsCache = await fetchV1Institutions();
  cacheTimestamp = now;
  return v1InstitutionsCache;
}

/**
 * Check if an institution is in V1 scope (async, database-backed)
 * Handles case normalization and whitespace trimming
 */
export async function isV1InstitutionAsync(institutionCode: string | null | undefined): Promise<boolean> {
  if (!institutionCode) return false;
  const normalized = institutionCode.toUpperCase().trim();
  const v1Set = await getV1InstitutionsSet();
  return v1Set.has(normalized);
}

/**
 * Synchronous check using cached data (fallback if cache empty)
 * Use this for immediate UI decisions, but prefer async version
 */
export function isV1Institution(institutionCode: string | null | undefined): boolean {
  if (!institutionCode) return false;
  const normalized = institutionCode.toUpperCase().trim();
  
  // Use cache if available, otherwise fallback
  if (v1InstitutionsCache) {
    return v1InstitutionsCache.has(normalized);
  }
  
  // Trigger async refresh for next check
  getV1InstitutionsSet().catch(() => {});
  
  // Use fallback for immediate response
  return new Set(FALLBACK_V1_INSTITUTIONS).has(normalized);
}

/**
 * Get list of V1 institutions (async)
 */
export async function getV1InstitutionsList(): Promise<string[]> {
  const v1Set = await getV1InstitutionsSet();
  return Array.from(v1Set);
}

/**
 * Force refresh the V1 scope cache
 * Call after adding a new institution to V1 scope
 */
export async function refreshV1ScopeCache(): Promise<void> {
  v1InstitutionsCache = null;
  cacheTimestamp = 0;
  await getV1InstitutionsSet();
}

/**
 * Legacy exports for backward compatibility
 * These will be phased out in future versions
 * @deprecated Use isV1InstitutionAsync instead
 */
export const V1_ALLOWED_INSTITUTIONS_LIST = FALLBACK_V1_INSTITUTIONS as readonly string[];
export const V1_ALLOWED_INSTITUTIONS = new Set<string>(FALLBACK_V1_INSTITUTIONS);

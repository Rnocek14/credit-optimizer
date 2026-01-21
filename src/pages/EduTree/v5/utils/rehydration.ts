/**
 * Plan Rehydration Utilities
 * 
 * Single source of truth for matching saved plan items to current marketplace options.
 * This prevents drift between different rehydration paths in the app.
 */

import { normalizeProviderCode } from '@/lib/providerNormalization';
import type { MarketplaceOption } from '../types/v5';

/**
 * Saved plan item structure (minimal fields for matching)
 */
export interface SavedPlanItem {
  courseId?: string;
  alt_identifier?: string;
  alt_source_code?: string;
  equivalency_key?: string;
}

/**
 * Match a saved plan item to a current marketplace option.
 * 
 * Uses stable matching fields (alt_identifier + alt_source_code) to handle
 * cases where primary IDs have changed due to normalization (e.g., STUDY_COM → STUDYCOM).
 * 
 * Priority:
 * 1. Exact courseId match (fastest, most common)
 * 2. Stable fields match (alt_identifier + normalized alt_source_code)
 * 3. Equivalency key match (fallback for legacy items)
 * 
 * @param savedItem - The item from a saved plan
 * @param option - The current marketplace option to compare against
 * @returns true if the items represent the same course
 */
export function matchSavedItemToOption(
  savedItem: SavedPlanItem,
  option: MarketplaceOption
): boolean {
  // 1. Exact courseId match
  if (savedItem.courseId && savedItem.courseId === option.courseId) {
    return true;
  }
  
  // 2. Stable fields match (handles STUDY_COM → STUDYCOM normalization)
  if (savedItem.alt_identifier && option.alt_identifier) {
    const savedProvider = normalizeProviderCode(savedItem.alt_source_code ?? '');
    const optionProvider = option.alt_source_code ?? '';
    
    if (savedItem.alt_identifier === option.alt_identifier && savedProvider === optionProvider) {
      return true;
    }
  }
  
  // 3. Equivalency key match (fallback)
  if (savedItem.equivalency_key && option.equivalency_key) {
    if (savedItem.equivalency_key === option.equivalency_key) {
      // Also need provider match to avoid cross-provider collisions
      const savedProvider = normalizeProviderCode(savedItem.alt_source_code ?? '');
      const optionProvider = option.alt_source_code ?? '';
      
      if (savedProvider === optionProvider) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Find a matching option from a list of marketplace options for a saved item
 */
export function findMatchingOption(
  savedItem: SavedPlanItem,
  options: MarketplaceOption[]
): MarketplaceOption | undefined {
  return options.find(opt => matchSavedItemToOption(savedItem, opt));
}

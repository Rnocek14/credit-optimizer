/**
 * Data merge utilities - Merge live DB data with seed layout data
 * Live data overrides display fields; seed provides positioning
 */

import type { V2RequirementBlock } from '../data/seedDataV2';

export interface DBBlock {
  id: string;
  slug?: string;
  title: string;
  rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
  level_year: number;
  area: string;
  credits_needed?: number;
  k?: number | null;
  parent_block_id?: string | null;
  updated_at?: string;
}

export interface DBCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  area: string;
  level_year: number;
  is_core: boolean;
  is_capstone: boolean;
  description?: string;
  updated_at?: string;
}

/**
 * Resolve block ID - handles mismatches between DB slugs and seed IDs
 * Seed IDs: y1-found, y2-cs-core, etc.
 * DB slugs: foundations, core-i, etc. (may have year prefix)
 */
function resolveBlockId(dbBlock: DBBlock): string {
  // If slug exists and starts with year prefix, use it directly
  if (dbBlock.slug && /^y\d-/.test(dbBlock.slug)) {
    return dbBlock.slug.toLowerCase();
  }
  
  // Otherwise construct: y{level_year}-{slug or id}
  const baseName = dbBlock.slug || dbBlock.id;
  return `y${dbBlock.level_year}-${baseName.toLowerCase()}`;
}

/**
 * Merge live DB blocks with seed layout blocks
 * Strategy: DB data overrides display fields, seed provides positioning
 */
export function mergeBlocksWithLiveData(
  seedBlocks: V2RequirementBlock[],
  liveBlocks: DBBlock[] | undefined
): V2RequirementBlock[] {
  if (!liveBlocks || liveBlocks.length === 0) {
    console.log('[DataMerge] No live blocks, using seed only');
    return seedBlocks;
  }

  // Create lookup map: resolved ID -> live block data
  const liveMap = new Map<string, DBBlock>();
  for (const live of liveBlocks) {
    const resolvedId = resolveBlockId(live);
    liveMap.set(resolvedId, live);
  }

  console.log('[DataMerge] Merging blocks:', {
    seed: seedBlocks.length,
    live: liveBlocks.length,
    liveKeys: Array.from(liveMap.keys()).slice(0, 10)
  });

  // Merge: for each seed block, override with live data if available
  const merged = seedBlocks.map(seedBlock => {
    const liveBlock = liveMap.get(seedBlock.id.toLowerCase());
    
    if (liveBlock) {
      // Found live data - merge display fields
      const mergedBlock: V2RequirementBlock = {
        ...seedBlock, // Keep positioning and metadata
        title: liveBlock.title, // Override display fields from DB
        rule_type: liveBlock.rule_type,
        credits_needed: liveBlock.credits_needed,
        area: liveBlock.area,
        // Preserve seed positioning and program/track info
      };
      
      return mergedBlock;
    }
    
    // No live data - use seed as-is
    return seedBlock;
  });

  const mergedCount = merged.filter((_, i) => liveMap.has(seedBlocks[i].id.toLowerCase())).length;
  console.log('[DataMerge] Merge complete:', {
    total: merged.length,
    mergedWithLive: mergedCount,
    seedOnly: merged.length - mergedCount
  });

  return merged;
}

/**
 * Generate stable data version hash for change detection
 * Changes when any live data updates
 */
export function calculateDataVersion(
  liveBlocks: DBBlock[] | undefined,
  liveCourses: DBCourse[] | undefined,
  selectionsUpdatedAt?: number
): string {
  const blockHashes = (liveBlocks ?? [])
    .map(b => `${b.id}:${b.updated_at ?? '0'}:${b.title}`)
    .sort()
    .join('|');
  
  const courseHashes = (liveCourses ?? [])
    .map(c => `${c.id}:${c.updated_at ?? '0'}:${c.title}`)
    .sort()
    .join('|');
  
  const selectionsHash = selectionsUpdatedAt ?? 0;
  
  // Simple hash: combine lengths + first/last item signatures
  const sig = `v${liveBlocks?.length ?? 0}b${liveCourses?.length ?? 0}c${selectionsHash}s`;
  
  // Add a checksum of the full data for real change detection
  const fullHash = `${blockHashes}::${courseHashes}`.slice(0, 50);
  
  return `${sig}-${simpleHash(fullHash)}`;
}

// Simple string hash (djb2 algorithm)
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
  }
  return (hash >>> 0).toString(36); // Convert to base36 for shorter string
}

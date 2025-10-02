/**
 * Pre-Index Hook - Build stable block ID resolution map
 * Prevents MISS storms by ensuring index is ready before rendering
 */

import { useState, useEffect, useMemo } from 'react';
import type { V2RequirementBlock } from '../data/seedDataV2';

// Simple alias generation without importing from manualLayoutRenderer
function getSimpleAliases(block: V2RequirementBlock): string[] {
  const aliases: string[] = [];
  const idLower = block.id.toLowerCase();
  const slugLower = (block.slug || '').toLowerCase();
  
  // Always include the raw ID and slug
  aliases.push(idLower);
  if (block.slug) aliases.push(slugLower);
  if (block.uuid) aliases.push(block.uuid.toLowerCase());
  
  return aliases;
}

export function useBlockIndex(blocks: V2RequirementBlock[], dataVersion: string) {
  const [isReady, setIsReady] = useState(false);
  
  // Build index synchronously in useMemo (stable across renders for same dataVersion)
  const index = useMemo(() => {
    const map = new Map<string, string>();
    
    console.log('[INDEX] Building index for', blocks.length, 'blocks, dataVersion:', dataVersion);
    
    for (const block of blocks) {
      if (!block.id) continue;
      
      // Add primary ID
      map.set(block.id.toLowerCase(), block.id);
      
      // Add all aliases
      const aliases = getSimpleAliases(block);
      for (const alias of aliases) {
        if (alias && !map.has(alias.toLowerCase())) {
          map.set(alias.toLowerCase(), block.id);
        }
      }
    }
    
    console.log('[INDEX] Built index with', map.size, 'keys');
    return map;
  }, [blocks, dataVersion]);
  
  // Mark as ready after index is built
  useEffect(() => {
    if (index.size > 0 && !isReady) {
      setIsReady(true);
      console.log('[INDEX_READY]', { 
        version: dataVersion,
        size: index.size,
        first10: Array.from(index.keys()).slice(0, 10)
      });
    }
  }, [index.size, isReady, dataVersion]);
  
  return { index, isReady };
}

/**
 * SAFE resolver: no negative-cache poisoning
 * Cache is bound to index instance via WeakMap to avoid cross-index contamination
 */
export function createCachedResolver(dataVersion: string) {
  // Cache per index instance to avoid cross-index contamination
  const perIndexCache = new WeakMap<Map<string, string>, Map<string, string>>();

  return function resolveBlockId(key: string, index: Map<string, string>): string | null {
    if (!key || !index) return null;

    let cache = perIndexCache.get(index);
    if (!cache) {
      cache = new Map<string, string>();
      perIndexCache.set(index, cache);
    }

    const ck = `${dataVersion}:${key.toLowerCase()}`;
    if (cache.has(ck)) {
      const v = cache.get(ck)!;
      // Guardrail: detect poisoned cache (should never happen now)
      if (!v) {
        console.warn('[CACHE_NULL_HIT]', { key, dataVersion, indexSize: index.size });
      }
      return v;
    }

    const normalized = key.toLowerCase();
    const hit = index.get(normalized);
    if (hit) {
      cache.set(ck, hit);
      return hit;
    }

    // NOTE: do NOT cache null; allow future lookups after index grows/changes
    if (Math.random() < 0.1) {
      console.warn('[KEY_RESOLUTION][MISS]', {
        key, normalized, indexSize: index.size, dataVersion
      });
    }
    return null;
  };
}

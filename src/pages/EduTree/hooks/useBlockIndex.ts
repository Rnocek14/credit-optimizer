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
        size: index.size, 
        dataVersion,
        sampleKeys: Array.from(index.keys()).slice(0, 10)
      });
    }
  }, [index.size, isReady, dataVersion]);
  
  return { index, isReady };
}

/**
 * Cached resolution with logging
 */
export function createCachedResolver(dataVersion: string) {
  const cache = new Map<string, string | null>();
  
  return function resolveBlockId(key: string, index: Map<string, string>): string | null {
    if (!key) return null;
    
    // Check cache first
    const cacheKey = `${dataVersion}:${key.toLowerCase()}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    
    // Try direct lookup
    const normalized = key.toLowerCase();
    const hit = index.get(normalized);
    
    if (hit) {
      cache.set(cacheKey, hit);
      return hit;
    }
    
    // Log miss (but don't spam)
    if (Math.random() < 0.1) {
      console.warn('[KEY_RESOLUTION][MISS]', { 
        key, 
        normalized,
        indexSize: index.size,
        dataVersion 
      });
    }
    
    cache.set(cacheKey, null);
    return null;
  };
}

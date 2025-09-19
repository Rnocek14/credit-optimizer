/**
 * Canonical Block Slug to ID Mapping
 * 
 * This file bridges the semantic slugs used in trackDefinitions.ts 
 * with the concrete block IDs used in seedDataV2.ts
 */

import { GOLDEN_LAYOUT_SEED } from './seedDataV2';

// Context-aware mapping for blocks that vary by program/track
export interface BlockMappingContext {
  programId?: string;
  trackId?: string;
}

// Canonical slug-to-ID mappings with context awareness
export const BLOCK_SLUG_MAP: Record<string, string | ((context?: BlockMappingContext) => string | null)> = {
  // Year 1 - Shared Foundation (context-independent)
  'foundations': 'y1-found',
  'mathematics': 'y1-math', 
  'general-education': 'y1-genedAB',
  
  // Year 2 - Program-specific core (context-dependent)
  'core-i': (context?: BlockMappingContext) => {
    if (context?.programId === 'bs_cs') return 'y2-cs-core';
    if (context?.programId === 'bs_it') return 'y2-it-core';
    return null; // Invalid without program context
  },
  
  // Year 2 - Program-specific electives (context-dependent)
  'program-electives': (context?: BlockMappingContext) => {
    if (context?.programId === 'bs_cs') return 'y2-cs-elec';
    if (context?.programId === 'bs_it') return 'y2-it-elec';
    return null;
  },
  
  // Year 3 - Track-specific core (context-dependent)
  'core-ii': (context?: BlockMappingContext) => {
    if (context?.trackId === 'se') return 'y3-se-core';
    if (context?.trackId === 'ds') return 'y3-ds-core';
    return null; // Invalid without track context
  },
  
  // Year 3 - Track-specific electives (context-dependent)
  'track-electives': (context?: BlockMappingContext) => {
    if (context?.trackId === 'se') return 'y3-se-elec';
    if (context?.trackId === 'ds') return 'y3-ds-elec';
    return null;
  },
  
  // Year 4 - Capstones (context-dependent)
  'capstone': (context?: BlockMappingContext) => {
    if (context?.trackId === 'se') return 'y4-se-cap';
    if (context?.trackId === 'ds') return 'y4-ds-cap';
    if (context?.programId === 'bs_it') return 'y4-it-cap';
    return null;
  },
  
  // Virtual blocks (gates)
  'program-gate': 'gate-y2-programs',
  'track-gate': 'gate-y3-tracks'
};

/**
 * Resolve a semantic slug to concrete block ID(s)
 */
export function resolveSlugToId(
  slug: string, 
  context?: BlockMappingContext
): string | null {
  const mapping = BLOCK_SLUG_MAP[slug];
  
  if (typeof mapping === 'string') {
    return mapping;
  }
  
  if (typeof mapping === 'function') {
    return mapping(context);
  }
  
  console.warn(`[BlockMapping] Unknown slug: ${slug}`);
  return null;
}

/**
 * Resolve multiple slugs for a specific program/track context
 */
export function resolveBlockIds(
  slugs: string[], 
  context: BlockMappingContext
): { resolved: string[]; missing: string[] } {
  const resolved: string[] = [];
  const missing: string[] = [];
  
  for (const slug of slugs) {
    const blockId = resolveSlugToId(slug, context);
    if (blockId) {
      resolved.push(blockId);
    } else {
      missing.push(slug);
    }
  }
  
  return { resolved, missing };
}

/**
 * Get all actual block IDs from seed data for validation
 */
export function getAllSeedBlockIds(): Set<string> {
  return new Set(GOLDEN_LAYOUT_SEED.blocks.map(block => block.id));
}

/**
 * Validate that all resolved IDs exist in seed data
 */
export function validateResolvedIds(blockIds: string[]): { valid: string[]; invalid: string[] } {
  const seedIds = getAllSeedBlockIds();
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const id of blockIds) {
    if (seedIds.has(id)) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }
  
  return { valid, invalid };
}

/**
 * Comprehensive validation of slug mappings
 */
export function validateSlugMappings(): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  const seedIds = getAllSeedBlockIds();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Test all static mappings
  for (const [slug, mapping] of Object.entries(BLOCK_SLUG_MAP)) {
    if (typeof mapping === 'string') {
      if (!seedIds.has(mapping)) {
        errors.push(`Static slug '${slug}' maps to non-existent block ID '${mapping}'`);
      }
    }
  }
  
  // Test context-dependent mappings with known contexts
  const testContexts: BlockMappingContext[] = [
    { programId: 'bs_cs' },
    { programId: 'bs_it' },
    { programId: 'bs_cs', trackId: 'se' },
    { programId: 'bs_cs', trackId: 'ds' }
  ];
  
  for (const context of testContexts) {
    for (const [slug, mapping] of Object.entries(BLOCK_SLUG_MAP)) {
      if (typeof mapping === 'function') {
        const resolved = mapping(context);
        if (resolved && !seedIds.has(resolved)) {
          errors.push(`Context slug '${slug}' with context ${JSON.stringify(context)} maps to non-existent block ID '${resolved}'`);
        }
      }
    }
  }
  
  // Check for orphaned blocks in seed that have no slug mapping
  const mappedIds = new Set<string>();
  
  // Add static mappings
  for (const mapping of Object.values(BLOCK_SLUG_MAP)) {
    if (typeof mapping === 'string') {
      mappedIds.add(mapping);
    }
  }
  
  // Add context-dependent mappings
  for (const context of testContexts) {
    for (const mapping of Object.values(BLOCK_SLUG_MAP)) {
      if (typeof mapping === 'function') {
        const resolved = mapping(context);
        if (resolved) mappedIds.add(resolved);
      }
    }
  }
  
  for (const blockId of seedIds) {
    if (!mappedIds.has(blockId)) {
      warnings.push(`Block ID '${blockId}' in seed data has no corresponding slug mapping`);
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}
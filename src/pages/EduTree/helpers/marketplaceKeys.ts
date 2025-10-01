/**
 * Marketplace Key Normalization
 * Generates multiple key variants to handle ID mismatches between seed data and marketplace
 */

export function marketplaceKeysFromNodeId(id: string): string[] {
  const raw = String(id || '').toLowerCase().trim();
  
  // Common abbreviation expansions for Year 1 blocks
  const expansions: Record<string, string[]> = {
    'found': ['found', 'foundations'],
    'math': ['math', 'mathematics'],
    'genedab': ['genedab', 'general-education', 'gened'],
    'gened': ['gened', 'general-education'],
  };
  
  // Generate variants to handle different naming conventions
  const noReq = raw.replace(/^req[-_]/, '');
  const noGate = raw.replace(/^gate[-_]/, '');
  const compact = raw.replace(/[\s_]+/g, '-');
  const noPick = raw.replace(/\(pick\s*\d+\)/gi, '').trim();
  const noYear = raw.replace(/^y\d+-/, '');
  
  // Create base variants
  const variants = new Set([
    raw,
    noReq,
    noGate,
    compact,
    noPick,
    noYear,
    noPick.replace(/[\s_]+/g, '-'),
    raw.replace(/[\s_-]+/g, ''),  // completely compact
  ]);
  
  // Add expansion variants for year-prefixed blocks
  // E.g., y1-found → [y1-found, y1-foundations, found, foundations]
  const yearMatch = raw.match(/^(y\d+)[-_](.+)$/);
  if (yearMatch) {
    const [, yearPrefix, suffix] = yearMatch;
    const expanded = expansions[suffix] || [suffix];
    expanded.forEach(exp => {
      variants.add(`${yearPrefix}-${exp}`); // y1-foundations
      variants.add(exp); // foundations
    });
  } else {
    // No year prefix - add expansions directly
    const expanded = expansions[noYear] || [noYear];
    expanded.forEach(exp => variants.add(exp));
  }
  
  return Array.from(variants);
}

/**
 * Get marketplace info for a block using fuzzy key matching
 */
export function getMpInfoForBlock(
  mpMap: Map<string, any> | undefined, 
  id: string
): { optionsCount: number; hasAceCredit: boolean; hasClep: boolean } | undefined {
  if (!mpMap || !id) return undefined;
  
  const variants = marketplaceKeysFromNodeId(id).map(k => k.toLowerCase());
  
  // Try direct match first
  for (const k of variants) {
    if (mpMap.has(k)) {
      const info = mpMap.get(k);
      return {
        optionsCount: info?.optionsCount ?? 0,
        hasAceCredit: info?.hasAceCredit ?? false,
        hasClep: info?.hasClep ?? false
      };
    }
  }
  
  // Try lenient match (strip all non-alphanumeric)
  const strip = (s: string) => s.replace(/[^a-z0-9]/g, '');
  const variantStrips = new Set(variants.map(strip));
  
  for (const [k, v] of mpMap.entries()) {
    if (variantStrips.has(strip(String(k).toLowerCase()))) {
      return {
        optionsCount: v?.optionsCount ?? 0,
        hasAceCredit: v?.hasAceCredit ?? false,
        hasClep: v?.hasClep ?? false
      };
    }
  }
  
  return undefined;
}

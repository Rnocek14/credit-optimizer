/**
 * Provider Code Normalization
 * Single source of truth for mapping template provider codes to database source_institution values
 */

/**
 * Canonical provider code mapping
 * Maps various template provider codes to their database-normalized values
 */
export const PROVIDER_ALIAS_MAP: Record<string, string> = {
  // StraighterLine aliases
  'SL': 'STRAIGHTERLINE',
  'STRAIGHTERLINE': 'STRAIGHTERLINE',
  // Study.com aliases
  'STUDY': 'STUDYCOM',
  'STUDYCOM': 'STUDYCOM',
  'SDC': 'STUDYCOM',
  // Sophia aliases
  'SOPHIA': 'SOPHIA',
  // CLEP stays as-is
  'CLEP': 'CLEP',
  // Standardized exams
  'AP': 'AP',
  'DSST': 'DSST',
  // Institutions
  'TESU': 'TESU',
  'COSC': 'COSC',
  'WGU': 'WGU',
  'TECEP': 'TECEP',
  'EXCELSIOR': 'EXCELSIOR',
};

// Track warned codes to avoid spamming console (one warning per code per session)
const warnedCodes = new Set<string>();

/**
 * Normalize a provider code to its canonical database value
 * Logs a dev warning if an unknown code is encountered
 * 
 * @param code - The provider code from a template or course
 * @returns The canonical provider code used in the database
 */
export function normalizeProviderCode(code: string): string {
  const upper = code.toUpperCase();
  const canonical = PROVIDER_ALIAS_MAP[upper];
  
  if (!canonical && !warnedCodes.has(upper)) {
    warnedCodes.add(upper);
    console.warn(
      `[ProviderNormalization] Unknown provider code: "${code}" (normalized: "${upper}"). ` +
      `Add to PROVIDER_ALIAS_MAP if this is a valid provider.`
    );
  }
  
  return canonical || upper;
}

/**
 * Check if a provider code is a known canonical value
 */
export function isKnownProvider(code: string): boolean {
  return PROVIDER_ALIAS_MAP[code.toUpperCase()] !== undefined;
}

/**
 * Get all canonical provider codes
 */
export function getCanonicalProviders(): string[] {
  return [...new Set(Object.values(PROVIDER_ALIAS_MAP))];
}

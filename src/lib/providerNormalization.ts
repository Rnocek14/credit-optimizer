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
  // Institutions (used for anchor residency exclusion)
  'TESU': 'TESU',
  'COSC': 'COSC',
  'WGU': 'WGU',
  'TECEP': 'TECEP',
  'EXCELSIOR': 'EXCELSIOR',
};

// Precomputed sets for fast lookup
const ALIAS_KEYS = new Set(Object.keys(PROVIDER_ALIAS_MAP));
const CANONICAL_VALUES = new Set(Object.values(PROVIDER_ALIAS_MAP));

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
 * Check if a provider code is a known alias or canonical value
 */
export function isKnownProvider(code: string): boolean {
  const upper = code.toUpperCase();
  return ALIAS_KEYS.has(upper) || CANONICAL_VALUES.has(upper);
}

/**
 * Get all canonical provider codes (sorted for stable output)
 */
export function getCanonicalProviders(): string[] {
  return [...CANONICAL_VALUES].sort();
}

/**
 * Course Code Normalization
 * Maps known course code aliases to their database-normalized values
 * Only explicitly whitelisted mappings - no aggressive string rewriting
 */
const COURSE_CODE_ALIAS_MAP: Record<string, string> = {
  // SOPHIA course code aliases (template → DB format)
  'SOPHIA-STATS': 'SOPHIA-STATISTICS',
  'SOPHIA-ART-HIST': 'SOPHIA-ART-HIST-I',
  'SOPHIA-INTRO-SOC': 'SOPH-SOC-101',
  'SOPHIA-INTRO-SOCIOLOGY': 'SOPH-SOC-101',
  'SOPHIA-MICROECON': 'SOPHIA-MICROECONOMICS',
  'SOPHIA-MACROECON': 'SOPHIA-MACROECONOMICS',
  // Fix hyphenation variants used in templates
  'SOPHIA-MICRO-ECON': 'SOPHIA-MICROECONOMICS',
  'SOPHIA-MACRO-ECON': 'SOPHIA-MACROECONOMICS',
  'SOPHIA-ENV-SCI': 'SOPHIA-ENVIRONMENTAL-SCIENCE',
  'SOPHIA-BUS-COMM': 'SOPHIA-BUSINESS-COMMUNICATION',
  'SOPHIA-BUS-LAW': 'SOPHIA-BUSINESS-LAW',
  'SOPHIA-ORG-BEH': 'SOPHIA-ORGANIZATIONAL-BEHAVIOR',
  'SOPHIA-PROJ-MGMT': 'SOPHIA-PROJECT-MANAGEMENT',
  'SOPHIA-PROJECT-MGMT': 'SOPHIA-PROJECT-MANAGEMENT',
  'SOPHIA-WEB-DEV': 'SOPHIA-WEB-DEVELOPMENT',
  'SOPHIA-INFO-SYS': 'SOPHIA-INFORMATION-SYSTEMS',
  
  // Study.com aliases - both directions for flexibility
  'SDC-PYTHON': 'STUDYCOM-PYTHON',
  'SDC-OS': 'STUDYCOM-OPERATING-SYSTEMS',
  'SDC-NETWORKS': 'STUDYCOM-COMPUTER-NETWORKS',
  'SDC-INTRO-CS': 'STUDYCOM-INTRO-CS',
  'STUDYCOM-CALC-I': 'SDC-CALC-I',
  'STUDYCOM-CALC-II': 'SDC-CALC-II',
  
  // StraighterLine aliases
  'SL-ENG-101': 'STRAIGHTERLINE-ENG101',
  'SL-MATH-101': 'STRAIGHTERLINE-MATH101',
};

// Precomputed for fast lookup
const COURSE_ALIAS_KEYS = new Set(Object.keys(COURSE_CODE_ALIAS_MAP));

// Track warned course codes
const warnedCourseCodes = new Set<string>();

/**
 * Normalize a course code to its canonical database value
 * Only maps explicitly whitelisted aliases - does NOT do aggressive rewriting
 * 
 * @param code - The course code from a template
 * @returns The canonical course code used in the database, or original if no alias
 */
export function normalizeCourseCode(code: string): string {
  const upper = code.toUpperCase();
  const canonical = COURSE_CODE_ALIAS_MAP[upper];
  
  // Return the alias if found, otherwise return uppercase for consistent matching
  return canonical || upper;
}

/**
 * Check if a course code has a known alias mapping
 */
export function hasKnownCourseAlias(code: string): boolean {
  return COURSE_ALIAS_KEYS.has(code.toUpperCase());
}

/**
 * Get all course code aliases (for debugging/auditing)
 */
export function getCourseCodeAliases(): Record<string, string> {
  return { ...COURSE_CODE_ALIAS_MAP };
}

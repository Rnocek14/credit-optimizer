/**
 * Centralized Institution URL Registry
 * 
 * SINGLE SOURCE OF TRUTH for all institution policy URLs.
 * When URLs need updating, update them HERE ONLY.
 * 
 * All other files should import from this module.
 */

export interface InstitutionUrlConfig {
  code: string;
  name: string;
  domain: string;
  transferPolicyUrl: string;
  alternativeUrls?: string[];  // Backup/secondary URLs
  lastVerified: string;        // ISO date of last manual verification
  notes?: string;
}

/**
 * Master registry of institution URLs.
 * Update these when URLs change - all consumers will automatically pick up changes.
 */
export const INSTITUTION_URLS: Record<string, InstitutionUrlConfig> = {
  TESU: {
    code: 'TESU',
    name: 'Thomas Edison State University',
    domain: 'tesu.edu',
    transferPolicyUrl: 'https://www.tesu.edu/transfer-credit',
    alternativeUrls: [
      'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/transfer-credit',
      'https://www.tesu.edu/admissions/faqs/transfer-credits.php',
    ],
    lastVerified: '2026-01-16',
    notes: 'Highly transfer-friendly. Main transfer page redirects to detailed info.',
  },
  
  COSC: {
    code: 'COSC',
    name: 'Charter Oak State College',
    domain: 'charteroak.edu',
    transferPolicyUrl: 'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
    alternativeUrls: [
      'https://www.charteroak.edu/catalog/current/',
    ],
    lastVerified: '2026-01-16',
    notes: 'Uses SmartCatalog. URLs change with catalog year - verify annually.',
  },
  
  WGU: {
    code: 'WGU',
    name: 'Western Governors University',
    domain: 'wgu.edu',
    transferPolicyUrl: 'https://www.wgu.edu/admissions/transfers.html',
    alternativeUrls: [],
    lastVerified: '2026-01-16',
    notes: 'Competency-based. Transfer credits evaluated per competency alignment.',
  },
  
  EXCELSIOR: {
    code: 'EXCELSIOR',
    name: 'Excelsior University',
    domain: 'excelsior.edu',
    transferPolicyUrl: 'https://www.excelsior.edu/admissions/transfer-credit/',
    alternativeUrls: [],
    lastVerified: '2026-01-16',
  },
  
  UMGC: {
    code: 'UMGC',
    name: 'University of Maryland Global Campus',
    domain: 'umgc.edu',
    transferPolicyUrl: 'https://www.umgc.edu/admissions/transfer-students',
    alternativeUrls: [],
    lastVerified: '2026-01-16',
  },
  
  SNHU: {
    code: 'SNHU',
    name: 'Southern New Hampshire University',
    domain: 'snhu.edu',
    transferPolicyUrl: 'https://www.snhu.edu/admission/transferring-credits',
    alternativeUrls: [],
    lastVerified: '2026-01-16',
  },
  
  EMPIRE: {
    code: 'EMPIRE',
    name: 'SUNY Empire State College',
    domain: 'esc.edu',
    transferPolicyUrl: 'https://www.esc.edu/transfer-credit/',
    alternativeUrls: [],
    lastVerified: '2026-01-16',
  },
  
  PURDUE_GLOBAL: {
    code: 'PURDUE_GLOBAL',
    name: 'Purdue University Global',
    domain: 'purdueglobal.edu',
    transferPolicyUrl: 'https://www.purdueglobal.edu/transfer-students/',
    alternativeUrls: [],
    lastVerified: '2026-01-16',
  },
};

/**
 * Get the canonical transfer policy URL for an institution.
 * Returns null if institution is not in registry.
 */
export function getInstitutionPolicyUrl(institutionCode: string): string | null {
  const config = INSTITUTION_URLS[institutionCode.toUpperCase()];
  return config?.transferPolicyUrl ?? null;
}

/**
 * Get all institution domains for URL validation allowlist.
 */
export function getInstitutionDomains(): string[] {
  return Object.values(INSTITUTION_URLS).map(config => config.domain);
}

/**
 * Check if an institution is in the registry.
 */
export function isKnownInstitution(institutionCode: string): boolean {
  return institutionCode.toUpperCase() in INSTITUTION_URLS;
}

/**
 * Get full config for an institution.
 */
export function getInstitutionConfig(institutionCode: string): InstitutionUrlConfig | null {
  return INSTITUTION_URLS[institutionCode.toUpperCase()] ?? null;
}

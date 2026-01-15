/**
 * URL Validation Utilities for Course Links
 * 
 * This module provides DENY-BY-DEFAULT validation for external course URLs.
 * 
 * IMPORTANT: We never fabricate URLs. If a course doesn't have a verified URL,
 * we hide the link rather than showing a broken one.
 * 
 * Defense layers:
 * 1. Database: url_status must be 'valid' (enforced via RLS - only service role can set)
 * 2. Hook: Only passes providerUrl when url_status === 'valid'
 * 3. Sanitizer: This module - final gate before render, requires HTTPS + allowlist
 */

/**
 * Strict URL verification status type.
 * - 'valid': URL has been verified by the worker and is safe to display
 * - 'invalid': URL was checked and is broken/inaccessible
 * - 'unknown': URL has not been verified yet (default for new records)
 */
export type UrlStatus = 'valid' | 'invalid' | 'unknown';

/**
 * Normalizes any input to strict UrlStatus union.
 * Accepts `unknown` for maximum safety - handles any garbage input.
 * Defaults to 'unknown' (deny by default).
 */
export function normalizeUrlStatus(raw: unknown): UrlStatus {
  if (raw === 'valid') return 'valid';
  if (raw === 'invalid') return 'invalid';
  return 'unknown'; // Default: treat as unverified
}

// Legitimate educational platform domains (HTTPS required)
const VALID_EDUCATIONAL_DOMAINS = [
  // Alternative credit providers (verified data)
  'sophia.org',
  'study.com',
  'collegeboard.org',
  'clep.collegeboard.org',
  'straighterline.com',
  'saylor.org',
  'modernstates.org',
  
  // Major MOOC platforms
  'coursera.org',
  'edx.org',
  'udemy.com',
  'udacity.com',
  'pluralsight.com',
  'linkedin.com', // LinkedIn Learning
  'skillshare.com',
  'codecademy.com',
  'khanacademy.org',
  'freecodecamp.org',
  
  // University-specific
  'tesu.edu',
  'wgu.edu',
  'excelsior.edu',
  'snhu.edu',
  'umgc.edu',
  'purdueglobal.edu',
  
  // Video platforms (for course content)
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  
  // Tech-specific learning
  'github.com',
  'microsoft.com',
  'aws.amazon.com',
  'cloud.google.com',
];

// Enable dev warnings via localStorage: localStorage.setItem('URL_VALIDATION_DEBUG', 'true')
const isDebugEnabled = () => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('URL_VALIDATION_DEBUG') === 'true';
  } catch {
    return false;
  }
};

/**
 * Logs a structured warning when a URL is blocked (dev mode only).
 * Helps surface upstream data issues without spamming production.
 */
function logBlockedUrl(url: string | undefined | null, reason: string, urlStatus: UrlStatus): void {
  if (!isDebugEnabled()) return;
  console.warn('[URL Blocked]', { url: url ?? '(empty)', reason, urlStatus });
}

/**
 * Validates that a URL is a proper HTTPS URL.
 * HTTP is rejected for security.
 */
export function isValidHttpsUrl(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates that a URL belongs to a known educational platform allowlist.
 * Does NOT check protocol - use with isValidHttpsUrl for full validation.
 */
export function isAllowlistedEducationalDomain(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();
    return VALID_EDUCATIONAL_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * @deprecated Use isAllowlistedEducationalDomain + isValidHttpsUrl instead
 */
export function isValidCourseUrl(url: string | undefined | null): boolean {
  return isValidHttpsUrl(url) && isAllowlistedEducationalDomain(url);
}

/**
 * @deprecated Use isValidHttpsUrl instead - we require HTTPS
 */
export function isValidHttpUrl(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects if a URL appears to be fabricated from an internal ID.
 * These patterns indicate the URL was dynamically constructed and likely broken.
 */
export function isFabricatedUrl(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  
  const fabricationPatterns = [
    // UUID-based fabrications
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    // Generic ID-based paths like /learn/coursera-1 or /course/edx_123
    /\/(learn|course)\/(coursera|edx|udemy|mock)[_-]\d+/i,
    // Mock/test indicators
    /mock|test|placeholder|sample|demo/i,
  ];
  
  return fabricationPatterns.some(pattern => pattern.test(url));
}

/**
 * Normalizes a URL by stripping common tracking parameters.
 * Returns the cleaned URL or null if invalid.
 */
function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    
    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Primary validation function - combines all checks.
 * Returns true only for URLs that are:
 * 1. Valid HTTPS URLs (HTTP rejected)
 * 2. From known educational platforms
 * 3. Not obviously fabricated
 */
export function isVerifiedCourseUrl(url: string | undefined | null): boolean {
  if (!isValidHttpsUrl(url)) return false;
  if (!isAllowlistedEducationalDomain(url)) return false;
  if (isFabricatedUrl(url)) return false;
  return true;
}

/**
 * DENY-BY-DEFAULT URL sanitizer for rendering course links.
 * 
 * This is the final gate before a URL is displayed to users.
 * It requires BOTH database verification AND domain validation.
 * 
 * @param url - The URL to sanitize
 * @param urlStatus - Database verification status (accepts unknown for safety)
 * @returns The sanitized URL or null if invalid/unverified
 * 
 * Logic:
 * 1. Normalize urlStatus to strict union (unknown if garbage)
 * 2. If status !== 'valid' → DENY (not verified in DB)
 * 3. If URL is empty → DENY
 * 4. If URL is not HTTPS → DENY
 * 5. If hostname not in allowlist → DENY
 * 6. If URL looks fabricated → DENY
 * 7. Strip tracking params and return normalized URL
 */
export function sanitizeCourseUrl(
  url: string | undefined | null,
  urlStatus?: unknown
): string | null {
  // Layer 1: Normalize and check database verification status
  const status = normalizeUrlStatus(urlStatus);
  if (status !== 'valid') {
    logBlockedUrl(url, 'url_status not valid', status);
    return null;
  }
  
  // Layer 2: URL must exist and be non-empty
  if (!url?.trim()) {
    logBlockedUrl(url, 'empty or null URL', status);
    return null;
  }
  
  // Layer 3: Must be HTTPS (block HTTP, javascript:, data:, etc.)
  if (!isValidHttpsUrl(url)) {
    logBlockedUrl(url, 'not HTTPS', status);
    return null;
  }
  
  // Layer 4: Must be from known educational domain
  if (!isAllowlistedEducationalDomain(url)) {
    logBlockedUrl(url, 'domain not in allowlist', status);
    return null;
  }
  
  // Layer 5: Must not look fabricated
  if (isFabricatedUrl(url)) {
    logBlockedUrl(url, 'appears fabricated', status);
    return null;
  }
  
  // All checks passed - normalize and return
  return normalizeUrl(url);
}

/**
 * URL Validation Utilities for Course Links
 * 
 * This module provides validation for external course URLs to prevent
 * "Page not found" errors from fabricated or invalid links.
 * 
 * IMPORTANT: We never fabricate URLs. If a course doesn't have a verified URL,
 * we hide the link rather than showing a broken one.
 */

// Legitimate educational platform domains
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

/**
 * Validates that a URL is a proper HTTP/HTTPS URL
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
 * Validates that a URL belongs to a known educational platform
 * This provides a higher bar than just checking for valid HTTP URLs
 */
export function isValidCourseUrl(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  
  try {
    const parsed = new URL(url.trim());
    
    // Must be HTTP or HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    
    // Check against known educational domains
    const hostname = parsed.hostname.toLowerCase();
    return VALID_EDUCATIONAL_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Detects if a URL appears to be fabricated from an internal ID
 * These patterns indicate the URL was dynamically constructed and likely broken
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
 * Primary validation function - combines all checks
 * Returns true only for URLs that are:
 * 1. Valid HTTP/HTTPS URLs
 * 2. From known educational platforms
 * 3. Not obviously fabricated
 */
export function isVerifiedCourseUrl(url: string | undefined | null): boolean {
  if (!isValidHttpUrl(url)) return false;
  if (!isValidCourseUrl(url)) return false;
  if (isFabricatedUrl(url)) return false;
  return true;
}

/**
 * Sanitizes a URL for safe display/linking
 * Returns null if the URL is invalid
 */
export function sanitizeCourseUrl(url: string | undefined | null): string | null {
  if (!isVerifiedCourseUrl(url)) return null;
  return url!.trim();
}

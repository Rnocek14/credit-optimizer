import { z } from 'zod';

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Security configuration
export const SECURITY_CONFIG = {
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 300,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
  INPUT_LIMITS: {
    MAX_STRING_LENGTH: 1000,
    MAX_ARRAY_LENGTH: 100,
    MAX_OBJECT_DEPTH: 5,
  },
  TRUSTED_DOMAINS: [
    'coursera.org',
    'edx.org', 
    'udacity.com',
    'udemy.com',
    'khanacademy.org',
    'codecademy.com',
    'pluralsight.com',
    'lynda.com',
    'skillshare.com',
    'freecodecamp.org'
  ]
} as const;

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (userId: string, action: string) => string;
}

export function isRateLimited(
  userId: string, 
  action: string, 
  config: RateLimitConfig = {
    maxRequests: SECURITY_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE,
    windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS
  }
): boolean {
  const key = config.keyGenerator ? config.keyGenerator(userId, action) : `${userId}:${action}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  const current = rateLimitMap.get(key);
  
  if (!current || current.resetTime < windowStart) {
    // Reset or initialize
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return false;
  }
  
  if (current.count >= config.maxRequests) {
    return true;
  }
  
  current.count++;
  return false;
}

export function sanitizeUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return null;
    }
    
    // Check if domain is trusted
    const domain = parsedUrl.hostname.toLowerCase();
    const isTrusted = SECURITY_CONFIG.TRUSTED_DOMAINS.some(trustedDomain => 
      domain === trustedDomain || domain.endsWith(`.${trustedDomain}`)
    );
    
    if (!isTrusted) {
      console.warn('Untrusted domain:', domain);
      return null;
    }
    
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .trim()
    .slice(0, SECURITY_CONFIG.INPUT_LIMITS.MAX_STRING_LENGTH);
}

export function validateArrayLength<T>(array: T[], maxLength = SECURITY_CONFIG.INPUT_LIMITS.MAX_ARRAY_LENGTH): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  
  return array.slice(0, maxLength);
}

export function validateObjectDepth(obj: any, maxDepth = SECURITY_CONFIG.INPUT_LIMITS.MAX_OBJECT_DEPTH): boolean {
  function checkDepth(item: any, currentDepth: number): boolean {
    if (currentDepth > maxDepth) {
      return false;
    }
    
    if (typeof item === 'object' && item !== null) {
      for (const key in item) {
        if (!checkDepth(item[key], currentDepth + 1)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  return checkDepth(obj, 0);
}

export function createSecureHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

export function hashSensitiveData(data: string): string {
  // Simple hash function for client-side use
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateUserOwnership(userId: string, resourceUserId: string): boolean {
  return userId === resourceUserId;
}

export function createAuditLog(action: string, userId: string, resourceId?: string, metadata?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: sanitizeInput(action),
    userId: sanitizeInput(userId),
    resourceId: resourceId ? sanitizeInput(resourceId) : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    metadata: metadata && validateObjectDepth(metadata) ? metadata : {}
  };
  
  // In production, this would be sent to a secure logging service
  console.log('AUDIT:', logEntry);
  
  return logEntry;
}

export function detectSuspiciousActivity(userId: string, actions: string[]): boolean {
  // Detect rapid-fire requests
  const now = Date.now();
  const recentActions = actions.filter(action => {
    const actionTime = new Date(action).getTime();
    return now - actionTime < 5000; // Last 5 seconds
  });
  
  if (recentActions.length > 20) {
    console.warn('Suspicious activity detected for user:', userId);
    return true;
  }
  
  return false;
}

// XSS protection helper
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CSRF protection helper
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
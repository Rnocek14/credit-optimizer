/**
 * Security utilities for input validation and sanitization
 */

// UUID validation
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize string inputs
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  return input.trim().slice(0, maxLength);
};

// Role validation
export const isValidRole = (role: string): boolean => {
  const validRoles = ['user', 'admin', 'mentor'];
  return validRoles.includes(role);
};

// XSS prevention
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// SQL injection prevention (basic)
export const sanitizeSqlInput = (input: string): string => {
  return input.replace(/['";\\]/g, '');
};

// Rate limiting utilities
export const generateRateLimitKey = (userId: string, action: string): string => {
  return `rate_limit:${action}:${userId}`;
};

// Rate limiting check
export const checkRateLimit = (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(key) || '[]');
  
  // Remove old attempts outside the window
  const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
  recentAttempts.push(now);
  localStorage.setItem(key, JSON.stringify(recentAttempts));
  return true;
};

// Clear dev mode data securely
export const clearDevMode = (): void => {
  localStorage.removeItem("devUser");
  delete window.__devUser__;
  
  // Clear any other dev-related localStorage items
  const devKeys = Object.keys(localStorage).filter(key => 
    key.includes('dev') || key.includes('demo')
  );
  devKeys.forEach(key => localStorage.removeItem(key));
};

// Session timeout management
export const DEV_SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

export const isDevSessionExpired = (): boolean => {
  if (!isDevelopment()) return false;
  
  const devUser = localStorage.getItem("devUser");
  if (!devUser) return false;
  
  try {
    const userData = JSON.parse(devUser);
    const sessionStart = userData.sessionStart || Date.now();
    return Date.now() - sessionStart > DEV_SESSION_TIMEOUT;
  } catch {
    return true;
  }
};

// Environment check
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

// Enhanced input validation
export const validateAndSanitizeInput = (
  input: string, 
  maxLength: number = 255,
  allowHtml: boolean = false
): { value: string; isValid: boolean; error?: string } => {
  if (!input || typeof input !== 'string') {
    return { value: '', isValid: false, error: 'Input is required' };
  }
  
  if (input.length > maxLength) {
    return { 
      value: '', 
      isValid: false, 
      error: `Input must be ${maxLength} characters or less` 
    };
  }
  
  const sanitized = allowHtml ? sanitizeHtml(input) : sanitizeString(input, maxLength);
  return { value: sanitized, isValid: true };
};

// Secure localStorage wrapper
export const secureStorage = {
  setItem: (key: string, value: any): void => {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        checksum: btoa(JSON.stringify(value)).slice(0, 8)
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  getItem: (key: string): any => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      const expectedChecksum = btoa(JSON.stringify(data.value)).slice(0, 8);
      
      if (data.checksum !== expectedChecksum) {
        console.warn('Data integrity check failed for:', key);
        localStorage.removeItem(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  }
};
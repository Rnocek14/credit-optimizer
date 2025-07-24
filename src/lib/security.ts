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

// Rate limiting key generation
export const generateRateLimitKey = (userId: string, action: string): string => {
  return `rate_limit:${action}:${userId}`;
};

// Environment check
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};
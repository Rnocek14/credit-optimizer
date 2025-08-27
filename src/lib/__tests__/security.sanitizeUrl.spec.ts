import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '@/utils/security';

describe('URL Sanitization', () => {
  describe('should accept trusted domains', () => {
    it('should accept coursera.org', () => {
      expect(sanitizeUrl('https://coursera.org/course/javascript')).toBe('https://coursera.org/course/javascript');
    });

    it('should accept edx.org subdomain', () => {
      expect(sanitizeUrl('https://courses.edx.org/course/cs50')).toBe('https://courses.edx.org/course/cs50');
    });

    it('should accept udemy.com', () => {
      expect(sanitizeUrl('https://www.udemy.com/course/react-complete')).toBe('https://www.udemy.com/course/react-complete');
    });

    it('should accept khanacademy.org', () => {
      expect(sanitizeUrl('https://www.khanacademy.org/math/algebra')).toBe('https://www.khanacademy.org/math/algebra');
    });

    it('should accept freecodecamp.org', () => {
      expect(sanitizeUrl('https://www.freecodecamp.org/learn')).toBe('https://www.freecodecamp.org/learn');
    });
  });

  describe('should reject untrusted domains', () => {
    it('should reject unknown domain', () => {
      expect(sanitizeUrl('https://malicious-site.com/course')).toBeNull();
    });

    it('should reject domain not in trusted list', () => {
      expect(sanitizeUrl('https://sketchy-education.net/course')).toBeNull();
    });

    it('should reject similar but not exact domain', () => {
      expect(sanitizeUrl('https://coursera-fake.org/course')).toBeNull();
    });
  });

  describe('should reject non-HTTPS protocols', () => {
    it('should reject HTTP', () => {
      expect(sanitizeUrl('http://coursera.org/course/javascript')).toBeNull();
    });

    it('should reject javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBeNull();
    });

    it('should reject data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBeNull();
    });

    it('should reject file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });
  });

  describe('should handle invalid URLs', () => {
    it('should reject malformed URL', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });

    it('should reject empty string', () => {
      expect(sanitizeUrl('')).toBeNull();
    });

    it('should reject URL with invalid characters', () => {
      expect(sanitizeUrl('https://coursera.org/course with spaces')).toBeNull();
    });
  });

  describe('should handle edge cases', () => {
    it('should accept URL with query parameters', () => {
      const url = 'https://coursera.org/course/javascript?utm_source=test';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should accept URL with hash fragment', () => {
      const url = 'https://coursera.org/course/javascript#lesson-1';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should accept URL with port (if on trusted domain)', () => {
      const url = 'https://coursera.org:443/course/javascript';
      expect(sanitizeUrl(url)).toBe(url);
    });
  });
});
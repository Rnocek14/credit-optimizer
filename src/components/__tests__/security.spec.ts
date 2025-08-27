import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '@/utils/security';

describe('Security Functions', () => {
  describe('URL Sanitization', () => {
    it('should accept trusted domains', () => {
      expect(sanitizeUrl('https://coursera.org/course/javascript')).toBe('https://coursera.org/course/javascript');
      expect(sanitizeUrl('https://www.udemy.com/course/react')).toBe('https://www.udemy.com/course/react');
      expect(sanitizeUrl('https://www.khanacademy.org/math')).toBe('https://www.khanacademy.org/math');
    });

    it('should reject untrusted domains', () => {
      expect(sanitizeUrl('https://malicious-site.com/course')).toBeNull();
      expect(sanitizeUrl('https://fake-coursera.net/course')).toBeNull();
    });

    it('should reject non-HTTPS protocols', () => {
      expect(sanitizeUrl('http://coursera.org/course')).toBeNull();
      expect(sanitizeUrl('javascript:alert("xss")')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBeNull();
    });

    it('should handle invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
    });
  });
});
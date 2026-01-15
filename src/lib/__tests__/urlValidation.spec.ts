import { describe, it, expect } from 'vitest';
import {
  normalizeUrlStatus,
  isValidHttpsUrl,
  isAllowlistedEducationalDomain,
  isFabricatedUrl,
  isVerifiedCourseUrl,
  sanitizeCourseUrl,
  type UrlStatus,
} from '../urlValidation';

describe('URL Validation System', () => {
  describe('normalizeUrlStatus', () => {
    it('should return valid for valid input', () => {
      expect(normalizeUrlStatus('valid')).toBe('valid');
    });

    it('should return invalid for invalid input', () => {
      expect(normalizeUrlStatus('invalid')).toBe('invalid');
    });

    it('should return unknown for unknown input', () => {
      expect(normalizeUrlStatus('unknown')).toBe('unknown');
    });

    it('should default to unknown for garbage input', () => {
      expect(normalizeUrlStatus('garbage')).toBe('unknown');
      expect(normalizeUrlStatus(null)).toBe('unknown');
      expect(normalizeUrlStatus(undefined)).toBe('unknown');
      expect(normalizeUrlStatus(123)).toBe('unknown');
      expect(normalizeUrlStatus({})).toBe('unknown');
      expect(normalizeUrlStatus('')).toBe('unknown');
    });
  });

  describe('isValidHttpsUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(isValidHttpsUrl('https://sophia.org/course')).toBe(true);
      expect(isValidHttpsUrl('https://www.coursera.org/learn/javascript')).toBe(true);
    });

    it('should reject HTTP URLs', () => {
      expect(isValidHttpsUrl('http://sophia.org/course')).toBe(false);
    });

    it('should reject dangerous protocols', () => {
      expect(isValidHttpsUrl('javascript:alert(1)')).toBe(false);
      expect(isValidHttpsUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidHttpsUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject empty/null/undefined', () => {
      expect(isValidHttpsUrl('')).toBe(false);
      expect(isValidHttpsUrl(null)).toBe(false);
      expect(isValidHttpsUrl(undefined)).toBe(false);
      expect(isValidHttpsUrl('   ')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidHttpsUrl('not-a-url')).toBe(false);
      expect(isValidHttpsUrl('https://')).toBe(false);
    });
  });

  describe('isAllowlistedEducationalDomain', () => {
    it('should accept known educational domains', () => {
      expect(isAllowlistedEducationalDomain('https://sophia.org/course')).toBe(true);
      expect(isAllowlistedEducationalDomain('https://study.com/academy')).toBe(true);
      expect(isAllowlistedEducationalDomain('https://coursera.org/learn')).toBe(true);
      expect(isAllowlistedEducationalDomain('https://edx.org/course')).toBe(true);
    });

    it('should accept subdomains of allowed domains', () => {
      expect(isAllowlistedEducationalDomain('https://www.sophia.org/course')).toBe(true);
      expect(isAllowlistedEducationalDomain('https://courses.edx.org/course')).toBe(true);
      expect(isAllowlistedEducationalDomain('https://clep.collegeboard.org/exam')).toBe(true);
    });

    it('should reject unknown domains', () => {
      expect(isAllowlistedEducationalDomain('https://malicious-site.com/course')).toBe(false);
      expect(isAllowlistedEducationalDomain('https://fake-sophia.org/course')).toBe(false);
    });

    it('should reject lookalike domains', () => {
      expect(isAllowlistedEducationalDomain('https://sophia.org.fake.com/course')).toBe(false);
      expect(isAllowlistedEducationalDomain('https://notsophia.org/course')).toBe(false);
    });
  });

  describe('isFabricatedUrl', () => {
    it('should detect UUID-based fabrications', () => {
      expect(isFabricatedUrl('https://sophia.org/course/a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    });

    it('should detect mock/test patterns', () => {
      expect(isFabricatedUrl('https://sophia.org/mock-course')).toBe(true);
      expect(isFabricatedUrl('https://sophia.org/test/placeholder')).toBe(true);
    });

    it('should detect generic ID patterns', () => {
      expect(isFabricatedUrl('https://example.com/learn/coursera-1')).toBe(true);
      expect(isFabricatedUrl('https://example.com/course/edx_123')).toBe(true);
    });

    it('should not flag legitimate URLs', () => {
      expect(isFabricatedUrl('https://sophia.org/online-courses/english-composition')).toBe(false);
      expect(isFabricatedUrl('https://coursera.org/learn/machine-learning')).toBe(false);
    });
  });

  describe('sanitizeCourseUrl (DENY-BY-DEFAULT)', () => {
    const validSophiaUrl = 'https://www.sophia.org/online-courses/english-composition';

    describe('Layer 1: url_status check', () => {
      it('should DENY when url_status is unknown', () => {
        expect(sanitizeCourseUrl(validSophiaUrl, 'unknown')).toBeNull();
      });

      it('should DENY when url_status is invalid', () => {
        expect(sanitizeCourseUrl(validSophiaUrl, 'invalid')).toBeNull();
      });

      it('should DENY when url_status is garbage', () => {
        expect(sanitizeCourseUrl(validSophiaUrl, 'garbage')).toBeNull();
        expect(sanitizeCourseUrl(validSophiaUrl, null)).toBeNull();
        expect(sanitizeCourseUrl(validSophiaUrl, undefined)).toBeNull();
        expect(sanitizeCourseUrl(validSophiaUrl, 123)).toBeNull();
      });

      it('should ALLOW when url_status is valid', () => {
        expect(sanitizeCourseUrl(validSophiaUrl, 'valid')).not.toBeNull();
      });
    });

    describe('Layer 2: Empty URL check', () => {
      it('should DENY empty URL even with valid status', () => {
        expect(sanitizeCourseUrl('', 'valid')).toBeNull();
        expect(sanitizeCourseUrl('   ', 'valid')).toBeNull();
        expect(sanitizeCourseUrl(null, 'valid')).toBeNull();
        expect(sanitizeCourseUrl(undefined, 'valid')).toBeNull();
      });
    });

    describe('Layer 3: HTTPS check', () => {
      it('should DENY HTTP URLs even with valid status', () => {
        expect(sanitizeCourseUrl('http://sophia.org/course', 'valid')).toBeNull();
      });

      it('should DENY dangerous protocols', () => {
        expect(sanitizeCourseUrl('javascript:alert(1)', 'valid')).toBeNull();
        expect(sanitizeCourseUrl('data:text/html,test', 'valid')).toBeNull();
      });
    });

    describe('Layer 4: Domain allowlist check', () => {
      it('should DENY non-allowlisted domains even with valid status', () => {
        expect(sanitizeCourseUrl('https://malicious-site.com/course', 'valid')).toBeNull();
        expect(sanitizeCourseUrl('https://fake-edu.org/course', 'valid')).toBeNull();
      });

      it('should ALLOW allowlisted educational domains', () => {
        expect(sanitizeCourseUrl('https://sophia.org/course', 'valid')).not.toBeNull();
        expect(sanitizeCourseUrl('https://study.com/course', 'valid')).not.toBeNull();
        expect(sanitizeCourseUrl('https://coursera.org/learn', 'valid')).not.toBeNull();
      });
    });

    describe('Layer 5: Fabrication check', () => {
      it('should DENY fabricated-looking URLs even with valid status', () => {
        const fabricatedUrl = 'https://sophia.org/course/a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        expect(sanitizeCourseUrl(fabricatedUrl, 'valid')).toBeNull();
      });
    });

    describe('URL normalization', () => {
      it('should strip tracking parameters', () => {
        const urlWithTracking = 'https://sophia.org/course?utm_source=test&utm_medium=email';
        const result = sanitizeCourseUrl(urlWithTracking, 'valid');
        expect(result).toBe('https://sophia.org/course');
      });

      it('should preserve non-tracking query params', () => {
        const urlWithParams = 'https://sophia.org/course?id=123&lesson=5';
        const result = sanitizeCourseUrl(urlWithParams, 'valid');
        expect(result).toContain('id=123');
        expect(result).toContain('lesson=5');
      });
    });

    describe('Real-world provider URLs', () => {
      const testCases = [
        { url: 'https://www.sophia.org/online-courses/english-and-composition/english-composition-i', expected: true },
        { url: 'https://study.com/academy/course/english-composition-i.html', expected: true },
        { url: 'https://clep.collegeboard.org/clep-exams/college-composition', expected: true },
        { url: 'https://www.straighterline.com/online-college-courses/english-composition-i/', expected: true },
        { url: 'https://learn.saylor.org/course/view.php?id=1', expected: true },
        { url: 'https://modernstates.org/course/english-composition/', expected: true },
        { url: 'https://www.coursera.org/learn/machine-learning', expected: true },
        { url: 'https://www.edx.org/learn/computer-science', expected: true },
      ];

      testCases.forEach(({ url, expected }) => {
        it(`should ${expected ? 'ALLOW' : 'DENY'} ${url}`, () => {
          const result = sanitizeCourseUrl(url, 'valid');
          if (expected) {
            expect(result).not.toBeNull();
          } else {
            expect(result).toBeNull();
          }
        });
      });
    });
  });

  describe('isVerifiedCourseUrl', () => {
    it('should require all checks to pass', () => {
      expect(isVerifiedCourseUrl('https://sophia.org/course')).toBe(true);
      expect(isVerifiedCourseUrl('http://sophia.org/course')).toBe(false);
      expect(isVerifiedCourseUrl('https://malicious.com/course')).toBe(false);
    });
  });
});

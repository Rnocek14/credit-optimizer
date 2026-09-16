/**
 * Evidence-URL classification tests.
 *
 * Guards the distinction between a document that supports a specific rule and
 * a marketing landing page auto-attached by the old backfill worker. Calling
 * the latter "source" is the misrepresentation this prevents.
 */
import { describe, it, expect } from 'vitest';
import { classifyEvidenceUrl, evidenceLinkLabel } from '../evidenceQuality';

describe('classifyEvidenceUrl', () => {
  it('flags the worker-written provider catalog pages as general', () => {
    expect(classifyEvidenceUrl('https://www.sophia.org/online-courses')).toBe('general');
    expect(classifyEvidenceUrl('https://study.com/academy/catalog.html')).toBe('general');
    expect(classifyEvidenceUrl('https://clep.collegeboard.org/clep-exams')).toBe('general');
  });

  it('flags the worker-written institution landing pages as general', () => {
    expect(classifyEvidenceUrl('https://www.tesu.edu/transfer-credit')).toBe('general');
    expect(classifyEvidenceUrl('https://www.wgu.edu/admissions/transfers.html')).toBe('general');
  });

  it('ignores trailing-slash and case differences', () => {
    expect(classifyEvidenceUrl('https://www.sophia.org/online-courses/')).toBe('general');
    expect(classifyEvidenceUrl('HTTPS://WWW.SOPHIA.ORG/ONLINE-COURSES')).toBe('general');
  });

  it('treats a genuine course-level document as specific', () => {
    expect(
      classifyEvidenceUrl('https://www.tesu.edu/transfer-credit/equivalency/SOPH-1001')
    ).toBe('specific');
  });

  it('treats an absent URL as none', () => {
    expect(classifyEvidenceUrl(null)).toBe('none');
    expect(classifyEvidenceUrl('   ')).toBe('none');
  });
});

describe('evidenceLinkLabel', () => {
  it('only says "source" for a course-specific document', () => {
    expect(evidenceLinkLabel('https://www.tesu.edu/transfer-credit/equivalency/X')).toBe('source');
  });

  it('describes a generic page as what it is', () => {
    expect(evidenceLinkLabel('https://www.sophia.org/online-courses')).toBe('general policy page');
  });
});

/**
 * Evidence-URL quality classification.
 *
 * Not every `evidence_url` on a transfer rule is evidence. The
 * `evidence-backfill-worker` edge function populated the column by mapping an
 * institution or provider code to a hardcoded landing page and storing that,
 * without ever fetching it — its own comment reads "page exists but we haven't
 * verified specific course". So a rule claiming "Sophia SOPH-1001 transfers to
 * TESU as X" could carry `https://www.sophia.org/online-courses` as its
 * source: a marketing catalog index that says nothing about that course or
 * that school.
 *
 * The worker is now unscheduled (migration 20260915120000), but rows it
 * already wrote remain. Cleaning those needs a review against production data,
 * so in the meantime the UI must not present a generic landing page as
 * documentary proof. This module tells the two apart so the label can be
 * honest: "source document" vs "general policy page".
 *
 * The URL lists below mirror EQUIVALENCY_PAGE_PATTERNS and
 * PROVIDER_CATALOG_PATTERNS in supabase/functions/evidence-backfill-worker.
 * If that function changes, update these together.
 */

/** Landing pages the backfill worker wrote as per-rule evidence. */
const MANUFACTURED_EVIDENCE_URLS: readonly string[] = [
  // EQUIVALENCY_PAGE_PATTERNS
  'https://www.tesu.edu/transfer-credit',
  'https://www.wgu.edu/admissions/transfers.html',
  'https://www.excelsior.edu/admissions/transfer-credit/',
  'https://www.esc.edu/transfer-credit/',
  'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
  'https://www.umgc.edu/admissions/transfer-students',
  'https://www.snhu.edu/admission/transferring-credits',
  'https://www.purdueglobal.edu/transfer-students/',
  // PROVIDER_CATALOG_PATTERNS
  'https://www.sophia.org/online-courses',
  'https://study.com/academy/catalog.html',
  'https://www.straighterline.com/online-college-courses/',
  'https://learn.saylor.org/',
  'https://modernstates.org/course/',
  'https://clep.collegeboard.org/clep-exams',
];

export type EvidenceQuality =
  /** A specific document that plausibly supports this individual rule. */
  | 'specific'
  /** A general policy or catalog page, auto-attached and not course-specific. */
  | 'general'
  /** No evidence URL at all. */
  | 'none';

/** Compare URLs ignoring trailing slash and case, which differ harmlessly. */
function canonical(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

const MANUFACTURED_SET = new Set(MANUFACTURED_EVIDENCE_URLS.map(canonical));

export function classifyEvidenceUrl(url: string | null | undefined): EvidenceQuality {
  if (!url || !url.trim()) return 'none';
  return MANUFACTURED_SET.has(canonical(url)) ? 'general' : 'specific';
}

/**
 * Link text for an evidence URL.
 *
 * "source" on a generic catalog page overstates what the link shows, so a
 * general page is labelled as what it is.
 */
export function evidenceLinkLabel(url: string | null | undefined): string {
  switch (classifyEvidenceUrl(url)) {
    case 'specific':
      return 'source';
    case 'general':
      return 'general policy page';
    case 'none':
      return '';
  }
}

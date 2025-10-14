// Type-aware aggregation utilities for LifePath bundles
export type NodeLike = { data?: Record<string, any> };

const COURSE_LIKE = new Set([
  'course', 'exam', 'assessment', 'module', 'requirement', 'class', 'subject'
]);

const CREDENTIAL_LIKE = new Set([
  'credential', 'certificate', 'degree', 'microdegree', 'nanodegree'
]);

const SKILL_LIKE = new Set([
  'skill', 'competency', 'outcome'
]);

const JOB_LIKE = new Set([
  'job', 'career', 'occupation', 'role'
]);

/** Extract course-only credits (excludes credentials/jobs) */
export function creditFromNode(n: NodeLike): number {
  const d = n?.data || {};
  const lpType = String(d.lpType || '').toLowerCase();

  // Only sum course-like credits
  if (!COURSE_LIKE.has(lpType)) return 0;

  // Prefer explicit course credit fields
  const c = d.credits ?? d.totalCredits ?? d.credits_needed ?? d.creditValue ?? 0;

  // Guard against absurd values unless flagged
  if (!d.isProgramCredit && Number.isFinite(c) && c > 20) return 0;

  return Number.isFinite(c) ? c : 0;
}

/** Extract time estimate (excludes jobs) */
export function timeFromNode(n: NodeLike): number {
  const d = n?.data || {};
  const lpType = String(d.lpType || '').toLowerCase();

  // Jobs don't contribute to time estimates
  if (JOB_LIKE.has(lpType)) return 0;

  const t = d.estimatedHours ?? d.hours ?? d.duration ?? 0;
  return Number.isFinite(t) ? t : 0;
}

/** Extract cost estimate (excludes jobs) */
export function costFromNode(n: NodeLike): number {
  const d = n?.data || {};
  const lpType = String(d.lpType || '').toLowerCase();

  // Jobs don't contribute to cost estimates
  if (JOB_LIKE.has(lpType)) return 0;

  const c = d.cost ?? d.price ?? d.tuition ?? 0;
  return Number.isFinite(c) ? c : 0;
}

/** Count nodes by type category */
export function countByType(nodes: NodeLike[]): {
  courses: number;
  credentials: number;
  skills: number;
  jobs: number;
} {
  return nodes.reduce((acc, n) => {
    const lpType = String(n?.data?.lpType || '').toLowerCase();
    
    if (COURSE_LIKE.has(lpType)) acc.courses++;
    else if (CREDENTIAL_LIKE.has(lpType)) acc.credentials++;
    else if (SKILL_LIKE.has(lpType)) acc.skills++;
    else if (JOB_LIKE.has(lpType)) acc.jobs++;
    
    return acc;
  }, { courses: 0, credentials: 0, skills: 0, jobs: 0 });
}

/**
 * Intelligence Layer — Marketplace Course → Candidate Mapper
 *
 * Pure mapping function: transforms marketplace course rows into
 * CourseCandidate shape for the scoring engine.
 *
 * Normalization rules enforced here:
 * - criContribution: 0–100 scale → 0–1 (clamped)
 * - timeEstimate: human-readable string from duration_weeks
 * - durationHours: left undefined (schema has weeks, not hours)
 *   → prevents quickWins pollution with fake hour math
 * - instructorReputation: 0–5 → 0–1 (clamped)
 * - platformTrust: completion_rate 0–100 → 0–1 (clamped)
 */

import type { CourseCandidate } from '@/shared/lib/intelligence/buildCandidates';
import { clamp01 } from '@/shared/lib/intelligence/normalize';

/** Minimal shape from the DAL fetch — only fields we need for intelligence. */
export interface MarketplaceCourseForIntelligence {
  id: string;
  code: string;
  title: string;
  description: string | null;
  skill_tags: string[] | null;
  duration_weeks: number | null;
  cri_score: number | null;
  instructor_rating: number | null;
  completion_rate: number | null;
  level: number | null;
  cost_usd: number | null;
  subject_area: string | null;
  provider_code: string | null;
}

const safeNumber = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

export function courseToCandidate(
  course: MarketplaceCourseForIntelligence,
): CourseCandidate {
  // CRI: DB stores 0–100 scale, intelligence expects 0–1
  const criRaw = safeNumber(course.cri_score, 0);
  const cri01 = criRaw > 1 ? clamp01(criRaw / 100) : clamp01(criRaw);

  // Duration: keep as human-readable string; don't synthesize hours
  const weeks = safeNumber(course.duration_weeks, 0);
  const timeEstimate = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}` : undefined;

  // Instructor: DB stores 0–5 scale
  const instructorRaw = safeNumber(course.instructor_rating, 0);
  const instructor01 = instructorRaw > 0 ? clamp01(instructorRaw / 5) : undefined;

  // Platform trust from completion rate: DB stores 0–100
  const completionRaw = safeNumber(course.completion_rate, 0);
  const trust01 = completionRaw > 0 ? clamp01(completionRaw / 100) : undefined;

  return {
    id: course.id,
    title: course.title,
    description: course.description ?? undefined,
    skillTags: course.skill_tags ?? [],
    // durationHours intentionally undefined — schema has weeks, not hours
    // This prevents quickWins from including multi-week courses
    durationHours: undefined,
    timeEstimate,
    criContributionNormalized: cri01 > 0 ? cri01 : undefined,
    instructorReputation: instructor01,
    platformTrust: trust01,
    href: `/discover?tab=courses&course=${encodeURIComponent(course.id)}`,
    provider: course.provider_code ?? undefined,
  };
}

export function coursesToCandidates(
  courses: MarketplaceCourseForIntelligence[],
): CourseCandidate[] {
  return courses.map(courseToCandidate);
}

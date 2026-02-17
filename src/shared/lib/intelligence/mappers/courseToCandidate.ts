/**
 * Intelligence Layer — Marketplace Course → Candidate Mapper
 *
 * Pure mapping function: transforms marketplace course rows into
 * RecommendationCandidate shape for the scoring engine.
 *
 * Normalization rules enforced here:
 * - criContribution: clamped to [0, 1]
 * - durationHours: converted from duration_weeks (×5h/week heuristic)
 * - instructorReputation: normalized from 0–5 to 0–1
 * - platformTrust: derived from completion_rate (0–100 → 0–1)
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

const HOURS_PER_WEEK_HEURISTIC = 5;

export function courseToCandidate(
  course: MarketplaceCourseForIntelligence,
): CourseCandidate {
  return {
    id: course.id,
    title: course.title,
    description: course.description ?? undefined,
    skillTags: course.skill_tags ?? [],
    durationHours: course.duration_weeks != null
      ? course.duration_weeks * HOURS_PER_WEEK_HEURISTIC
      : undefined,
    criContributionNormalized: course.cri_score != null
      ? clamp01(course.cri_score / 100)
      : undefined,
    instructorReputation: course.instructor_rating != null
      ? clamp01(course.instructor_rating / 5)
      : undefined,
    platformTrust: course.completion_rate != null
      ? clamp01(course.completion_rate / 100)
      : undefined,
    href: `/discover?tab=courses&course=${encodeURIComponent(course.id)}`,
    provider: course.provider_code ?? undefined,
  };
}

export function coursesToCandidates(
  courses: MarketplaceCourseForIntelligence[],
): CourseCandidate[] {
  return courses.map(courseToCandidate);
}

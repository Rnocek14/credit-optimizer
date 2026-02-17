/**
 * Intelligence Layer — Candidate Builder
 *
 * Deterministic: builds raw candidates from inputs.
 * No scoring. No network. No side effects.
 */

import type {
  RecommendationCandidate,
  UserIntelligenceContext,
  ParamsMap,
} from '@/shared/types/intelligence';
import type { SkillGap } from '@/types/skill';

/** Lightweight course shape fed into the builder. */
export interface CourseCandidate {
  id: string;
  title: string;
  description?: string;
  skillTags?: string[];
  durationHours?: number;
  timeEstimate?: string;           // human-readable, e.g. "4 weeks"
  criContributionNormalized?: number;
  marketDemandScore?: number;
  marketGrowthRate?: number;
  instructorReputation?: number;
  platformTrust?: number;
  mayaConfidence?: number;
  mayaExplanation?: string;
  href?: string;
  provider?: string;
  /** Provider code for display/filtering */
  providerCode?: string;
  /** Provider UUID for write-path actions (e.g. inserting into user_plan_courses) */
  providerId?: string;
  /** Subject area for requirement-block matching */
  subjectArea?: string;
}

/** Lightweight proof-project shape fed into the builder. */
export interface ProofProjectCandidate {
  id: string;
  title: string;
  description?: string;
  skillTags?: string[];
  durationHours?: number;
  difficulty?: string | null;
}

export function buildCandidates(
  ctx: UserIntelligenceContext,
  inputs: {
    skillGaps: SkillGap[];
    courseCandidates: CourseCandidate[];
    proofProjects: ProofProjectCandidate[];
  },
): RecommendationCandidate[] {
  const out: RecommendationCandidate[] = [];

  // Skill gap action candidates
  for (const g of inputs.skillGaps) {
    out.push({
      id: `gap:${g.skill.toLowerCase()}`,
      source: 'skill_gap',
      title: `Close gap: ${g.skill}`,
      description: `Improve ${g.skill} to reach your career goals`,
      skillTags: [g.skill],
      durationHours: undefined,
      criContribution: g.criImpact ? g.criImpact / 100 : undefined,
      actions: [
        {
          kind: 'navigate' as const,
          label: 'Find Courses',
          on: 'discover' as const,
          href: `/discover?skills=${encodeURIComponent(g.skill)}&filter=skill-gaps`,
        },
        {
          kind: 'navigate' as const,
          label: 'View Gap',
          on: 'progress' as const,
          href: `/progress?tab=skill-tree&skill=${encodeURIComponent(g.skill)}`,
        },
      ],
      meta: { gapPriority: g.priority },
    });
  }

  // Course candidates
  for (const c of inputs.courseCandidates) {
    out.push({
      id: `course:${c.id}`,
      source: 'course_api',
      title: c.title,
      description: c.description ?? '',
      skillTags: c.skillTags ?? [],
      durationHours: c.durationHours,
      timeEstimate: c.timeEstimate,
      criContribution: c.criContributionNormalized,
      marketDemandScore: c.marketDemandScore,
      marketGrowthRate: c.marketGrowthRate,
      instructorReputation: c.instructorReputation,
      platformTrust: c.platformTrust,
      mayaConfidence: c.mayaConfidence,
      mayaExplanation: c.mayaExplanation,
      actions: [
        {
          kind: 'open' as const,
          label: 'Open Course',
          on: 'discover' as const,
          href: c.href ?? `/discover?tab=courses&course=${encodeURIComponent(c.id)}`,
        },
        {
          kind: 'save_to_plan' as const,
          label: 'Add to Plan',
          on: 'plan' as const,
          href: `/plan?addCourse=${encodeURIComponent(c.id)}`,
          params: {
            courseId: c.id,
            trackId: ctx.activeTrackId ?? '',
            ...(c.providerCode ? { providerCode: c.providerCode } : {}),
          },
        },
        {
          kind: 'add_to_edutree' as const,
          label: 'Add to EduTree',
          on: 'plan' as const,
          params: {
            courseId: c.id,
            trackId: ctx.activeTrackId ?? '',
            ...(c.providerId ? { providerId: c.providerId } : {}),
            ...(c.providerCode ? { providerCode: c.providerCode } : {}),
            ...(c.subjectArea ? { subjectArea: c.subjectArea } : {}),
          },
        },
      ],
      meta: { provider: c.provider ?? null, trackId: ctx.activeTrackId ?? null },
    });
  }

  // Proof project candidates
  for (const p of inputs.proofProjects) {
    out.push({
      id: `proof:${p.id}`,
      source: 'proof_project',
      title: p.title,
      description: p.description ?? 'Build a proof project',
      skillTags: p.skillTags ?? [],
      durationHours: p.durationHours,
      actions: [
        {
          kind: 'navigate' as const,
          label: 'View Project',
          on: 'plan' as const,
          href: `/plan?tab=proof&project=${encodeURIComponent(p.id)}`,
        },
      ],
      meta: { difficulty: p.difficulty ?? null },
    });
  }

  return out;
}

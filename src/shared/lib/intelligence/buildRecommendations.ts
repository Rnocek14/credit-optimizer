/**
 * Intelligence Layer — Recommendation Assembler
 *
 * Scores candidates via scorer plugins and produces
 * the canonical IntelligenceRecommendation[] output.
 */

import type {
  IntelligenceRecommendation,
  RecommendationCandidate,
  ScoringBreakdown,
  UserIntelligenceContext,
} from '@/shared/types/intelligence';
import type { RecoPriority, RecoType } from '@/types/recommendations';
import { clamp01 } from '@/shared/lib/intelligence/normalize';
import type { ScorerPlugin } from './scorers/types';

function inferRecoType(source: RecommendationCandidate['source']): RecoType {
  switch (source) {
    case 'course_api':
      return 'skill_gap';      // courses map to skill_gap reco type
    case 'proof_project':
      return 'proof_project';
    case 'skill_gap':
      return 'skill_gap';
    case 'market_trend':
      return 'market_alert';
    default:
      return 'skill_gap';
  }
}

function inferPriority(
  candidate: RecommendationCandidate,
  ctx: UserIntelligenceContext,
): RecoPriority {
  const tags = new Set((candidate.skillTags ?? []).map((s) => s.toLowerCase()));
  const matched = (ctx.skillGaps ?? []).filter(
    (g) => g.skill && tags.has(g.skill.toLowerCase()),
  );
  if (matched.some((g) => g.priority === 'critical')) return 'critical';
  if (matched.some((g) => g.priority === 'high')) return 'high';
  return 'medium';
}

export function buildRecommendations(
  ctx: UserIntelligenceContext,
  candidates: RecommendationCandidate[],
  scorers: ScorerPlugin[],
): IntelligenceRecommendation[] {
  const computedAt = new Date().toISOString();

  const recs: IntelligenceRecommendation[] = candidates.map((c) => {
    const breakdown: ScoringBreakdown[] = scorers.map((s) => {
      const res = s.score(c, ctx);
      const raw = clamp01(res.rawScore);
      return {
        scorerName: s.name,
        rawScore: raw,
        weight: s.weight,
        weighted: raw * s.weight,
        explanation: res.explanation,
      };
    });

    const compositeScore = clamp01(
      breakdown.reduce((sum, b) => sum + b.weighted, 0),
    );

    return {
      id: c.id,
      source: c.source,
      type: inferRecoType(c.source),
      title: c.title,
      description: c.description,
      priority: inferPriority(c, ctx),
      compositeScore,
      breakdown,
      criContribution: c.criContribution,
      marketDemandScore: c.marketDemandScore,
      marketGrowthRate: c.marketGrowthRate,
      durationHours: c.durationHours,
      timeEstimate: c.timeEstimate,
      progress: c.progress,
      skills: c.skillTags,
      actions: c.actions ?? [],
      computedAt,
    };
  });

  // Highest composite score first
  recs.sort((a, b) => b.compositeScore - a.compositeScore);
  return recs;
}

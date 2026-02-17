/**
 * Intelligence Layer — Legacy Adapter
 *
 * @deprecated Temporary adapter for Phase 1–2 migration.
 * Delete after all UI consumers use IntelligenceRecommendation directly.
 *
 * Maps IntelligenceRecommendation → UnifiedRecommendation
 * so existing UI components (RecommendationCard, QuickActions, etc.)
 * can consume intelligence output without modification.
 */

import type { IntelligenceRecommendation } from '@/shared/types/intelligence';
import type { ParamsMap } from '@/shared/types/intelligence';
import type { UnifiedRecommendation } from '@/types/recommendations';

/** @deprecated Use IntelligenceRecommendation directly. */
export function toUnifiedRecommendationLegacy(
  rec: IntelligenceRecommendation,
): UnifiedRecommendation {
  return {
    id: rec.id,
    type: rec.type,
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    reason: rec.criExplanation ?? rec.breakdown?.[0]?.explanation,
    timeEstimate: rec.timeEstimate,
    progress: rec.progress,
    skills: rec.skills,
    actions: rec.actions.map((a) => ({
      kind: a.kind,
      label: a.label,
      href: a.href,
      on: a.on,
      params: a.params as Record<string, string | number | boolean> | undefined,
    })),
    // NOTE: computedAt used until Phase 2 introduces source timestamps
    createdAt: rec.computedAt,
    score: Math.max(0, Math.min(10, rec.compositeScore * 10)),
    criBoost: rec.criContribution ? Math.round(rec.criContribution * 100) : undefined,
    criExplanation: rec.criExplanation,
  };
}

/** @deprecated Use IntelligenceRecommendation[] directly. */
export function toUnifiedRecommendationsLegacy(
  recs: IntelligenceRecommendation[],
): UnifiedRecommendation[] {
  return recs.map(toUnifiedRecommendationLegacy);
}

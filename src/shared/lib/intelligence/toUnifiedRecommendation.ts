/**
 * Intelligence Layer — Legacy Adapter
 *
 * Maps IntelligenceRecommendation → UnifiedRecommendation
 * so existing UI components (RecommendationCard, QuickActions, etc.)
 * can consume intelligence output without modification.
 *
 * This adapter is temporary — it will be removed once all consumers
 * are updated to use IntelligenceRecommendation directly.
 */

import type { IntelligenceRecommendation } from '@/shared/types/intelligence';
import type { UnifiedRecommendation } from '@/types/recommendations';

export function toUnifiedRecommendation(
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
      label: a.label,
      href: a.href,
      on: a.on,
      params: a.params as Record<string, string | number | boolean> | undefined,
    })),
    createdAt: rec.computedAt,
    score: rec.compositeScore * 10, // normalize 0–1 → legacy 0–10 range
    criBoost: rec.criContribution ? Math.round(rec.criContribution * 100) : undefined,
    criExplanation: rec.criExplanation,
  };
}

export function toUnifiedRecommendations(
  recs: IntelligenceRecommendation[],
): UnifiedRecommendation[] {
  return recs.map(toUnifiedRecommendation);
}

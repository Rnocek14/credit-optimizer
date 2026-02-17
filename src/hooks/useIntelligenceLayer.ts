/**
 * Unified Intelligence Layer — Primary Hook
 *
 * Consolidates skill gaps, CRI, market intelligence, and Maya
 * into a single scored recommendation pipeline.
 *
 * Architecture:
 * - Input queries fetched via existing hooks (DAL-compliant)
 * - Composite output derived via useMemo (no double-caching)
 * - Scoring via pluggable scorer pipeline (0–1 normalized)
 *
 * See docs/INTELLIGENCE_LAYER.md for full spec.
 */

import { useMemo } from 'react';
import type {
  IntelligenceOutput,
  UserIntelligenceContext,
  CRISnapshot,
  IntelligenceRecommendation,
} from '@/shared/types/intelligence';
import type { SkillGap } from '@/types/skill';

import { DEFAULT_SCORING_WEIGHTS } from '@/shared/lib/intelligence/constants';
import { buildDefaultScorers } from '@/shared/lib/intelligence/scorers';
import { buildCandidates } from '@/shared/lib/intelligence/buildCandidates';
import { buildRecommendations } from '@/shared/lib/intelligence/buildRecommendations';

// ── Canonical input hooks (preserved, not replaced) ─────────────
import { useSkillGaps } from '@/hooks/useSkillGaps';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';

/**
 * Map the existing CRIScore shape into the intelligence CRISnapshot contract.
 */
function toCRISnapshot(
  criScore: { overall: number; skillsScore: number; experienceScore: number } | undefined | null,
  targetCRI = 80,
): CRISnapshot | null {
  if (!criScore) return null;
  return {
    overall: criScore.overall,
    skillsScore: criScore.skillsScore,
    experienceScore: criScore.experienceScore,
    targetCRI,
    gap: targetCRI - criScore.overall,
  };
}

export function useIntelligenceLayer(userId?: string, trackId?: string) {
  // ── 1) Input hooks ────────────────────────────────────────────
  const skillGapsQ = useSkillGaps(userId);
  const readinessQ = useCareerReadiness({ userId, enabled: !!userId });

  const isLoading = skillGapsQ.isLoading || readinessQ.isLoading;
  const isError = skillGapsQ.isError || !!readinessQ.error;

  // ── 2) Build context ──────────────────────────────────────────
  const ctx: UserIntelligenceContext = useMemo(
    () => ({
      userId: userId ?? '',
      activeTrackId: trackId,
      skillGaps: skillGapsQ.data ?? [],
      cri: toCRISnapshot(readinessQ.criScore),
    }),
    [userId, trackId, skillGapsQ.data, readinessQ.criScore],
  );

  // ── 3) Derive composite output via useMemo ────────────────────
  const output: IntelligenceOutput = useMemo(() => {
    const computedAt = new Date().toISOString();
    const staleAt = new Date(Date.now() + 2 * 60_000).toISOString();

    const skillGaps: SkillGap[] = skillGapsQ.data ?? [];
    const cri = toCRISnapshot(readinessQ.criScore);

    // Build candidates from available inputs
    // Phase 1: skill gaps only. Phase 2 adds course/proof candidates.
    const rawCandidates = buildCandidates(ctx, {
      skillGaps,
      courseCandidates: [],   // Phase 2: wire marketplace courses
      proofProjects: [],       // Phase 2: wire proof projects
    });

    // Score via plugin pipeline
    const scorers = buildDefaultScorers(DEFAULT_SCORING_WEIGHTS);
    const recommendations = buildRecommendations(ctx, rawCandidates, scorers);

    const topRecommendation: IntelligenceRecommendation | null =
      recommendations[0] ?? null;

    const quickWins = recommendations.filter((r) => {
      if (r.durationHours != null) return r.durationHours <= 1;
      // Fallback: parse timeEstimate string
      const match = r.timeEstimate?.match(/(\d+)\s*(min|m)\b/i);
      return match ? Number(match[1]) <= 60 : false;
    });

    const criticalGaps = skillGaps.filter((g) => g.priority === 'critical');

    return {
      recommendations,
      skillGaps,
      cri,
      marketSignals: [], // Phase 2: wire market signals
      meta: {
        computedAt,
        staleAt,
        trackId,
        scoringWeights: DEFAULT_SCORING_WEIGHTS,
        candidateCount: rawCandidates.length,
        selectedCount: recommendations.length,
      },
      topRecommendation,
      quickWins,
      criticalGaps,
    };
  }, [ctx, skillGapsQ.data, readinessQ.criScore, trackId]);

  return {
    ...output,
    isLoading,
    isError,
  };
}

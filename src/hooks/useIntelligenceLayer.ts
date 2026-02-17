/**
 * Unified Intelligence Layer — Primary Hook
 *
 * Consolidates skill gaps, CRI, market intelligence, and Maya
 * into a single scored recommendation pipeline.
 *
 * Architecture:
 * - Input queries fetched via existing hooks (DAL-compliant)
 * - Marketplace courses fetched via DAL + mapped to candidates
 * - Composite output derived via useMemo (no double-caching)
 * - Scoring via pluggable scorer pipeline (0–1 normalized)
 *
 * See docs/INTELLIGENCE_LAYER.md for full spec.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { fetchMarketplaceCoursesForIntelligence } from '@/shared/lib/api/marketplaceCourses';
import { coursesToCandidates } from '@/shared/lib/intelligence/mappers/courseToCandidate';

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

  // Extract gap skill names — sanitized, lowercased, sorted for stable cache keys
  const gapSkills = useMemo(
    () =>
      (skillGapsQ.data ?? [])
        .map(g => g.skill)
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map(s => s.toLowerCase().trim())
        .sort(),
    [skillGapsQ.data],
  );
  const gapHash = gapSkills.join('|');

  // ── 2) Marketplace course candidates (DAL-compliant) ──────────
  // Key ordering: ['intelligence', userId, trackId, 'marketplace', gapHash]
  // This ensures invalidateUserIntelligence (pos 0+1) and
  // invalidateTrackIntelligence (pos 0+1+2) both match.
  const marketplaceQ = useQuery({
    queryKey: ['intelligence', userId, trackId, 'marketplace', gapHash],
    queryFn: () => fetchMarketplaceCoursesForIntelligence(gapSkills),
    enabled: !!userId && !skillGapsQ.isLoading,
    staleTime: 5 * 60_000,
  });

  const isLoading = skillGapsQ.isLoading || readinessQ.isLoading || marketplaceQ.isLoading;
  const isError = skillGapsQ.isError || !!readinessQ.error || marketplaceQ.isError;

  // ── 3) Build context ──────────────────────────────────────────
  const ctx: UserIntelligenceContext = useMemo(
    () => ({
      userId: userId ?? '',
      activeTrackId: trackId,
      skillGaps: skillGapsQ.data ?? [],
      cri: toCRISnapshot(readinessQ.criScore),
    }),
    [userId, trackId, skillGapsQ.data, readinessQ.criScore],
  );

  // ── 4) Derive composite output via useMemo ────────────────────
  const output: IntelligenceOutput = useMemo(() => {
    const computedAt = new Date().toISOString();
    const staleAt = new Date(Date.now() + 2 * 60_000).toISOString();

    const skillGaps: SkillGap[] = skillGapsQ.data ?? [];
    const cri = toCRISnapshot(readinessQ.criScore);

    // Map marketplace courses to CourseCandidate shape
    const courseCandidates = coursesToCandidates(marketplaceQ.data ?? []);

    // Build candidates from all available inputs
    const rawCandidates = buildCandidates(ctx, {
      skillGaps,
      courseCandidates,
      proofProjects: [],       // Phase 2B: wire proof projects
    });

    // Score via plugin pipeline
    const scorers = buildDefaultScorers(DEFAULT_SCORING_WEIGHTS);
    const recommendations = buildRecommendations(ctx, rawCandidates, scorers);

    const topRecommendation: IntelligenceRecommendation | null =
      recommendations[0] ?? null;

    const quickWins = recommendations.filter((r) => {
      if (r.durationHours != null) return r.durationHours <= 1;
      const mins = r.timeEstimate?.match(/(\d+)\s*(min|mins|minute|minutes|m)\b/i);
      if (mins) return Number(mins[1]) <= 60;
      const hrs = r.timeEstimate?.match(/(\d+(?:\.\d+)?)\s*(hr|hrs|hour|hours|h)\b/i);
      if (hrs) return Number(hrs[1]) <= 1;
      return false;
    });

    const criticalGaps = skillGaps.filter((g) => g.priority === 'critical');

    return {
      recommendations,
      skillGaps,
      cri,
      marketSignals: [], // Phase 2B: wire market signals
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
  }, [ctx, skillGapsQ.data, readinessQ.criScore, trackId, marketplaceQ.data]);

  return {
    ...output,
    isLoading,
    isError,
  };
}

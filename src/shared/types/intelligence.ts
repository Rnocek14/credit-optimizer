/**
 * Unified Intelligence Layer — Type Contracts
 *
 * Single source of truth for all intelligence computation types.
 * See docs/INTELLIGENCE_LAYER.md for architecture.
 */

import type { SkillGap, SkillPriority } from '@/types/skill';
import type { RecoPriority, RecoType } from '@/types/recommendations';

// ─── User Context (assembled once per computation) ──────────────

export interface UserIntelligenceContext {
  userId: string;
  activeTrackId?: string;
  activeGoal?: {
    id: string;
    title: string;
    targetRole?: string;
    skillGaps?: string[];
  };
  location?: {
    id: string;
    label: string;
    value: string;
  };
  experienceLevel?: string;
  industry?: string;
}

// ─── Scoring Engine ─────────────────────────────────────────────

/**
 * A scoring plugin computes a 0–1 score for a recommendation candidate
 * given the user's context. Pure function — no side effects.
 */
export interface ScorerPlugin {
  name: string;
  weight: number; // 0–1, all weights must sum to 1.0
  score: (candidate: RecommendationCandidate, context: UserIntelligenceContext) => number;
}

/**
 * Raw candidate before scoring — could be a course, skill gap action,
 * market opportunity, or Maya suggestion.
 */
export interface RecommendationCandidate {
  id: string;
  source: 'skill_gap' | 'course_api' | 'market_trend' | 'maya_insight' | 'proof_project';
  title: string;
  description: string;

  // Scoring inputs (optional — scorers handle missing gracefully)
  skillTags?: string[];
  difficulty?: number;           // 1–5
  durationHours?: number;
  criContribution?: number;      // expected CRI change
  marketDemandScore?: number;    // 0–1
  marketGrowthRate?: number;     // -1 to +1
  instructorReputation?: number; // 0–5
  platformTrust?: number;        // 0–1
  peerScore?: number;            // 0–1 (future: social signals)
  mayaConfidence?: number;       // 0–1

  // Pass-through metadata for UI rendering
  timeEstimate?: string;
  progress?: number;             // 0–100
  href?: string;
  actions?: Array<{
    label: string;
    href?: string;
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: Record<string, string | number | boolean>;
  }>;
  meta?: Record<string, unknown>;
}

/**
 * Per-scorer contribution to the composite score.
 * Enables "why this recommendation?" explanations.
 */
export interface ScoringBreakdown {
  scorerName: string;
  rawScore: number;      // 0–1 from the scorer
  weight: number;        // scorer weight
  weighted: number;      // rawScore × weight
  explanation?: string;  // human-readable reason
}

// ─── Unified Output Types ───────────────────────────────────────

/**
 * The canonical recommendation shape produced by the intelligence layer.
 * Replaces UnifiedRecommendation, RealCourse, PredictiveInsight.
 */
export interface IntelligenceRecommendation {
  id: string;
  source: RecommendationCandidate['source'];
  type: RecoType;
  title: string;
  description: string;
  priority: RecoPriority;

  // Composite score (0–1) from weighted scorers
  compositeScore: number;
  breakdown: ScoringBreakdown[];

  // CRI-specific
  criContribution?: number;
  criExplanation?: string;

  // Market-specific
  marketDemandScore?: number;
  marketGrowthRate?: number;

  // UI rendering
  timeEstimate?: string;
  progress?: number;
  skills?: string[];
  actions: Array<{
    label: string;
    href?: string;
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: Record<string, string | number | boolean>;
  }>;

  // Timestamps
  computedAt: string;
}

/**
 * CRI snapshot included in intelligence output.
 */
export interface CRISnapshot {
  overall: number;
  skillsScore: number;
  experienceScore: number;
  targetCRI: number;
  gap: number; // targetCRI - overall
}

/**
 * Market signal surfaced by the intelligence layer.
 */
export interface MarketSignal {
  id: string;
  type: 'demand_spike' | 'salary_trend' | 'growth_alert' | 'competition_shift';
  careerPath: string;
  location?: string;
  value: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
  description: string;
}

/**
 * Metadata about the intelligence computation.
 */
export interface IntelligenceMeta {
  computedAt: string;
  staleAt: string;
  trackId?: string;
  scoringWeights: Record<string, number>;
  candidateCount: number;
  selectedCount: number;
}

/**
 * The complete output contract of useIntelligenceLayer.
 */
export interface IntelligenceOutput {
  recommendations: IntelligenceRecommendation[];
  skillGaps: SkillGap[];
  cri: CRISnapshot | null;
  marketSignals: MarketSignal[];
  meta: IntelligenceMeta;

  // Derived convenience accessors
  topRecommendation: IntelligenceRecommendation | null;
  quickWins: IntelligenceRecommendation[];      // ≤60 min
  criticalGaps: SkillGap[];                      // priority === 'critical'
}

// ─── Default Scoring Weights ────────────────────────────────────

export const DEFAULT_SCORING_WEIGHTS: Record<string, number> = {
  cri: 0.35,
  market: 0.25,
  skillGap: 0.25,
  maya: 0.10,
  reputation: 0.05,
} as const;

/**
 * Maps a RecoPriority to a numeric value for scoring.
 */
export const PRIORITY_SCORE: Record<RecoPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

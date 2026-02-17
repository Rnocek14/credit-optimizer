/**
 * Unified Intelligence Layer — Type Contracts
 *
 * Single source of truth for all intelligence computation types.
 * See docs/INTELLIGENCE_LAYER.md for architecture.
 */

import type { SkillGap, SkillPriority } from '@/types/skill';
import type { RecoPriority, RecoType } from '@/types/recommendations';

// ─── Typed Maps (no raw Record) ─────────────────────────────────

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

/** Typed params for action buttons — no `any` leakage. */
export type ParamsMap = Record<string, JsonPrimitive>;

/** Typed metadata bag — structured but flexible. */
export type MetaMap = Record<string, JsonValue>;

/** Scoring weight keys are fixed — typo-proof and exhaustive. */
export type ScoringWeights = Record<'cri' | 'market' | 'skillGap' | 'maya' | 'reputation', number>;

/** Priority → numeric score map, keyed by RecoPriority. */
export type PriorityScoreMap = Record<RecoPriority, number>;

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

  // Resolved input data (populated by useIntelligenceLayer)
  skillGaps?: SkillGap[];
  cri?: CRISnapshot | null;
}

// ─── Scoring Engine ─────────────────────────────────────────────

/**
 * A scoring plugin computes a 0–1 score for a recommendation candidate
 * given the user's context. Pure function — no side effects.
 *
 * CONTRACT:
 * - rawScore MUST be clamped to [0, 1]
 * - Scorers MUST normalize their inputs internally
 * - explanation SHOULD be human-readable
 */
export interface ScorerPlugin {
  name: string;
  weight: number; // 0–1, all weights must sum to 1.0
  score: (candidate: RecommendationCandidate, context: UserIntelligenceContext) => ScorerResult;
}

/** Scorer return value — always normalized 0–1 with explanation. */
export interface ScorerResult {
  rawScore: number;       // 0–1 clamped
  explanation?: string;   // human-readable reason
}

/**
 * Raw candidate before scoring — could be a course, skill gap action,
 * market opportunity, or proof project.
 *
 * NOTE: Maya is a *signal layer*, not a candidate source.
 * Maya provides boosts/penalties/explanations on existing candidates
 * via mayaConfidence and mayaExplanation fields. Maya does NOT
 * generate its own candidates.
 */
export interface RecommendationCandidate {
  id: string;
  source: 'skill_gap' | 'course_api' | 'market_trend' | 'proof_project';
  title: string;
  description: string;

  // Scoring inputs (optional — scorers handle missing gracefully)
  skillTags?: string[];
  difficulty?: number;           // 1–5
  durationHours?: number;
  criContribution?: number;      // expected CRI change (0–1 normalized)
  marketDemandScore?: number;    // 0–1
  marketGrowthRate?: number;     // -1 to +1 (scorer normalizes to 0–1)
  instructorReputation?: number; // 0–5 (scorer normalizes to 0–1)
  platformTrust?: number;        // 0–1
  peerScore?: number;            // 0–1 (future: social signals)
  mayaConfidence?: number;       // 0–1 (Maya signal boost)
  mayaExplanation?: string;      // Maya's reasoning for the boost

  // Pass-through metadata for UI rendering
  timeEstimate?: string;
  progress?: number;             // 0–100
  href?: string;
  actions?: Array<{
    label: string;
    href?: string;
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: ParamsMap;
  }>;
  meta?: MetaMap;
}

/**
 * Per-scorer contribution to the composite score.
 * Enables "why this recommendation?" explanations.
 */
export interface ScoringBreakdown {
  scorerName: string;
  rawScore: number;      // 0–1 from the scorer (clamped)
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
  durationHours?: number;
  timeEstimate?: string;
  progress?: number;
  skills?: string[];
  actions: Array<{
    label: string;
    href?: string;
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: ParamsMap;
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
 * These are informational — not scored candidates.
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
  scoringWeights: ScoringWeights;
  candidateCount: number;
  selectedCount: number;
}

/**
 * The complete output contract of useIntelligenceLayer.
 *
 * NOTE: The composite output (recommendations, quickWins, criticalGaps)
 * is derived via useMemo from cached input queries — NOT its own useQuery.
 * This prevents double-caching and incoherent invalidation.
 */
export interface IntelligenceOutput {
  recommendations: IntelligenceRecommendation[];
  skillGaps: SkillGap[];
  cri: CRISnapshot | null;
  marketSignals: MarketSignal[];
  meta: IntelligenceMeta;

  // Derived convenience accessors (computed in useMemo, not cached separately)
  topRecommendation: IntelligenceRecommendation | null;
  quickWins: IntelligenceRecommendation[];      // ≤60 min
  criticalGaps: SkillGap[];                      // priority === 'critical'
}

// ─── Scoring Utilities ──────────────────────────────────────────

/** Clamp a value to [0, 1]. All scorers MUST use this. */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Normalize a value from [min, max] to [0, 1], clamped. */
export const normalize = (v: number, min: number, max: number): number =>
  clamp01((v - min) / (max - min || 1));

// ─── Default Scoring Weights ────────────────────────────────────

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  cri: 0.35,
  market: 0.25,
  skillGap: 0.25,
  maya: 0.10,
  reputation: 0.05,
} as const;

/**
 * Maps a RecoPriority to a numeric value for scoring.
 */
export const PRIORITY_SCORE: PriorityScoreMap = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

import type {
  RecommendationCandidate,
  ScorerResult,
  UserIntelligenceContext,
  ScoringWeights,
} from '@/shared/types/intelligence';

export interface ScorerPlugin {
  name: keyof ScoringWeights;
  weight: number;
  score: (candidate: RecommendationCandidate, ctx: UserIntelligenceContext) => ScorerResult;
}

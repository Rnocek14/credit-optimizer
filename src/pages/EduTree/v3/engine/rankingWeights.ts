/**
 * Ranking weights for alternative path scoring
 * Used to determine best alternatives at checkpoint forks
 */
export const RANKING_WEIGHTS = Object.freeze({
  CREDITS_KEPT: 0.4,       // 40%: Maximize credit retention
  TIME_WEEKS: 0.3,         // 30%: Minimize duration
  COST_USD: 0.2,           // 20%: Minimize cost
  OUTCOME_ALIGNMENT: 0.1   // 10%: Career outcome alignment
});

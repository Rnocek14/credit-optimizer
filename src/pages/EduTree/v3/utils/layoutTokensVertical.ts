/**
 * Layout tokens for pure vertical flow
 * - Single centerline spine (CENTER_X)
 * - Sequential Y positioning (VERTICAL_GAP)
 * - Y3 side-by-side via H_SPACING
 * - All measurements grid-aligned
 */

export const VERT = Object.freeze({
  // Grid alignment (all positions snap to this)
  GRID: 8,

  // Centerline X for the spine (all nodes except Y3 split)
  CENTER_X: 680,

  // Node dimensions (collapsed bundles)
  NODE_WIDTH: 232,
  NODE_HEIGHT: 120,

  // Gate card height (slightly shorter than bundles)
  GATE_HEIGHT: 80,

  // Vertical gap between items in the spine
  VERTICAL_GAP: 80,
  
  // Tier spacing for checkpoint injection (Phase 3)
  TIER_SPACING_PX: 160,

  // Horizontal separation for Y3 SE/DS tracks (side-by-side)
  H_SPACING: 320,

  // === Phase 1: Ranking weights for deterministic top-2 alternative selection ===
  RANKING_WEIGHTS: {
    CREDITS_KEPT: 0.4,       // 40% weight: maximizes credit retention
    TIME_WEEKS: 0.3,         // 30% weight: minimizes duration
    COST_USD: 0.2,           // 20% weight: minimizes cost
    OUTCOME_ALIGNMENT: 0.1,  // 10% weight: aligns with career outcomes
  },

  // === Phase 1: Merge edge styling ===
  MERGE_RADIUS: 24, // Larger curve radius for converging paths (vs 12 for regular edges)
});

export type VerticalTokens = typeof VERT;

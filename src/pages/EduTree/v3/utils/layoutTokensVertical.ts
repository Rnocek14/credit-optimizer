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

  // Horizontal separation for Y3 SE/DS tracks (side-by-side)
  H_SPACING: 320,
});

export type VerticalTokens = typeof VERT;

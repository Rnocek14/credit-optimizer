/**
 * Layout Tokens V3 - Frozen immutable constants
 * Single source of truth for all V3 positioning
 * 
 * CRITICAL CONSTRAINT: 2 * TRACK_COLUMN_OFFSET >= NODE_WIDTH + H_GAP
 * This ensures SE/DS lanes never horizontally overlap at same Y coordinate
 * Width MUST match CSS var(--v3-node-w) exactly
 */

const GRID = 8;
const H_GAP = 24;
const NODE_WIDTH = 232; // MUST match CSS --v3-node-w exactly

// Derive offset to guarantee no horizontal overlap: 2*offset >= width + gap
const TRACK_COLUMN_OFFSET = Math.ceil((NODE_WIDTH + H_GAP) / 2 / GRID) * GRID;

export const LAYOUT_TOKENS = Object.freeze({
  NODE_WIDTH,
  NODE_BASE_HEIGHT: 120,
  NODE_MAX_HEIGHT: 250,
  LANE_GAP: 72,
  H_GAP,
  TRACK_COLUMN_OFFSET,
  YEAR_COL: { Y1: 300, Y2: 700, Y3: 1100, Y4: 1500 } as const,
  COL_TOLERANCE: 40,
  REGION_GUTTER: 24,
  TRACK_GUTTER: 16,
  GRID
});

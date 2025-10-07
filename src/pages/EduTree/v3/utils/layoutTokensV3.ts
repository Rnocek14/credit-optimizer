/**
 * Layout Tokens V3 - Frozen immutable constants
 * Single source of truth for all V3 positioning
 * 
 * CRITICAL CONSTRAINT: 2 * TRACK_COLUMN_OFFSET >= NODE_WIDTH + H_GAP
 * This ensures SE/DS lanes never horizontally overlap at same Y coordinate
 * Current: 2*136=272 >= 232+24=256 ✓
 */

const GRID = 8;
const H_GAP = 24;
// Measured from actual ReactFlow node (.react-flow__node) with min-w-[180px] + padding/borders
// Real DOM width is ~232px, so we use that for collision calculations
const NODE_WIDTH = 232;

// Compute offset to guarantee no horizontal overlap: 2*offset >= width + gap
const TRACK_COLUMN_OFFSET = Math.ceil((NODE_WIDTH + H_GAP) / 2 / GRID) * GRID;

export const LAYOUT_TOKENS = Object.freeze({
  NODE_WIDTH,
  NODE_BASE_HEIGHT: 120,
  NODE_MAX_HEIGHT: 250,     // collision safety
  LANE_GAP: 60,
  YEAR_COL: { Y1: 300, Y2: 700, Y3: 1100, Y4: 1500 } as const,
  TRACK_COLUMN_OFFSET,      // SE left, DS right (computed: ensures NODE_WIDTH + H_GAP clearance)
  H_GAP,                    // horizontal safety gutter between adjacent columns
  COL_TOLERANCE: 40,        // must be < (NODE_WIDTH + H_GAP)/2 to avoid incorrect bucketing
  REGION_GUTTER: 24,
  TRACK_GUTTER: 16,
  GRID
});

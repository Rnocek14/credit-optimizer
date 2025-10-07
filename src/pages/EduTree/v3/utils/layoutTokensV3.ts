/**
 * Layout Tokens V3 - Frozen immutable constants
 * Single source of truth for all V3 positioning
 * 
 * CRITICAL CONSTRAINT: 2 * TRACK_COLUMN_OFFSET >= NODE_WIDTH + H_GAP
 * This ensures SE/DS lanes never horizontally overlap at same Y coordinate
 * Current: 2*120=240 >= 180+24=204 ✓
 */

export const LAYOUT_TOKENS = Object.freeze({
  NODE_WIDTH: 180,
  NODE_BASE_HEIGHT: 120,
  NODE_MAX_HEIGHT: 250,     // collision safety
  LANE_GAP: 60,
  YEAR_COL: { Y1: 300, Y2: 700, Y3: 1100, Y4: 1500 } as const,
  TRACK_COLUMN_OFFSET: 120, // SE left, DS right (240px total separation = 180+24+36 margin)
  H_GAP: 24,                // horizontal safety gutter between adjacent columns
  COL_TOLERANCE: 48,
  REGION_GUTTER: 24,
  TRACK_GUTTER: 16,
  GRID: 8
});

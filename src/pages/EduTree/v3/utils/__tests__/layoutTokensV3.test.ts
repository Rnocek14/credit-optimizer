import { describe, it, expect } from 'vitest';
import { LAYOUT_TOKENS } from '../layoutTokensV3';

describe('layoutTokensV3 constraints', () => {
  it('track lanes are horizontally non-overlapping by construction', () => {
    // For SE and DS lanes to not overlap horizontally at the same Y:
    // 2 * TRACK_COLUMN_OFFSET >= NODE_WIDTH + H_GAP
    const needed = LAYOUT_TOKENS.NODE_WIDTH + LAYOUT_TOKENS.H_GAP;
    const provided = 2 * LAYOUT_TOKENS.TRACK_COLUMN_OFFSET;
    
    expect(provided).toBeGreaterThanOrEqual(needed);
    expect(LAYOUT_TOKENS.TRACK_COLUMN_OFFSET).toBeGreaterThanOrEqual(Math.ceil(needed / 2));
  });

  it('all spacing tokens are grid-aligned', () => {
    const { GRID, LANE_GAP, H_GAP, TRACK_COLUMN_OFFSET, REGION_GUTTER, TRACK_GUTTER } = LAYOUT_TOKENS;
    
    expect(LANE_GAP % GRID).toBe(0);
    expect(H_GAP % GRID).toBe(0);
    expect(TRACK_COLUMN_OFFSET % GRID).toBe(0);
    expect(REGION_GUTTER % GRID).toBe(0);
    expect(TRACK_GUTTER % GRID).toBe(0);
  });

  it('year columns are properly spaced and grid-aligned', () => {
    const { YEAR_COL, GRID } = LAYOUT_TOKENS;
    
    Object.values(YEAR_COL).forEach(col => {
      expect(col % GRID).toBe(0);
    });
    
    // Verify reasonable spacing between years
    expect(YEAR_COL.Y2).toBeGreaterThan(YEAR_COL.Y1);
    expect(YEAR_COL.Y3).toBeGreaterThan(YEAR_COL.Y2);
    expect(YEAR_COL.Y4).toBeGreaterThan(YEAR_COL.Y3);
  });

  it('node dimensions support collision detection', () => {
    const { NODE_WIDTH, NODE_MAX_HEIGHT, NODE_BASE_HEIGHT } = LAYOUT_TOKENS;
    
    expect(NODE_WIDTH).toBeGreaterThan(0);
    expect(NODE_MAX_HEIGHT).toBeGreaterThanOrEqual(NODE_BASE_HEIGHT);
  });

  it('column tolerance is safely below half minDX to avoid bucketing errors', () => {
    const minDX = LAYOUT_TOKENS.NODE_WIDTH + LAYOUT_TOKENS.H_GAP;
    const halfMinDX = minDX / 2;
    
    expect(LAYOUT_TOKENS.COL_TOLERANCE).toBeLessThan(halfMinDX);
  });
});

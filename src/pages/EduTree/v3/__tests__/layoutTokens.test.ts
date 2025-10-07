import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';

describe('V3 Layout Tokens', () => {
  it('lane spacing prevents horizontal overlaps', () => {
    // Critical invariant: SE/DS tracks must have enough horizontal separation
    const needed = LAYOUT_TOKENS.NODE_WIDTH + LAYOUT_TOKENS.H_GAP;
    const provided = 2 * LAYOUT_TOKENS.TRACK_COLUMN_OFFSET;
    
    expect(provided).toBeGreaterThanOrEqual(needed);
  });

  it('width matches CSS variable', () => {
    // NODE_WIDTH must match --v3-node-w in index.css
    expect(LAYOUT_TOKENS.NODE_WIDTH).toBe(232);
  });

  it('vertical spacing prevents stacking collisions', () => {
    // LANE_GAP should be sufficient for typical node heights
    const minGap = LAYOUT_TOKENS.LANE_GAP;
    expect(minGap).toBeGreaterThan(50); // reasonable minimum
  });
});

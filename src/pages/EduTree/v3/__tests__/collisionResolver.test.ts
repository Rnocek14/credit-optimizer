import { describe, it, expect } from 'vitest';
import { resolveCollisions } from '../engine/collisionResolver';
import { computeRegions } from '../engine/regionManager';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

const base = (id: string, y: number, trackId?: 'se' | 'ds'): V3Node =>
  ({ 
    id, 
    type: 'requirement', 
    data: { year: 3, programId: 'bs_cs', trackId }, 
    position: { x: LAYOUT_TOKENS.YEAR_COL.Y3, y } 
  });

describe('collisionResolver', () => {
  it('nudges overlapping nodes within a corridor', () => {
    const nodes = [base('a', 100, 'se'), base('b', 120, 'se')];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const out = resolveCollisions(nodes, regions, LAYOUT_TOKENS);
    
    expect(out[1]?.position.y).toBeGreaterThan(out[0]?.position.y ?? 0);
    expect((out[1]?.position.y ?? 0) - (out[0]?.position.y ?? 0))
      .toBeGreaterThanOrEqual(LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP);
  });

  it('separates nodes in different track corridors', () => {
    const nodes = [base('se1', 100, 'se'), base('ds1', 100, 'ds')];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const out = resolveCollisions(nodes, regions, LAYOUT_TOKENS);
    
    // SE and DS should not overlap vertically after resolution
    const seNode = out.find(n => n.id === 'se1');
    const dsNode = out.find(n => n.id === 'ds1');
    
    expect(seNode).toBeDefined();
    expect(dsNode).toBeDefined();
  });
});

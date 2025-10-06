import { describe, it, expect } from 'vitest';
import { validateNoOverlaps } from '../engine/overlapValidator';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

describe('overlapValidator', () => {
  it('detects no overlaps for spaced nodes', () => {
    const nodes: V3Node[] = [
      { id: 'n1', type: 'requirement', data: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'requirement', data: {}, position: { x: 1000, y: 1000 } },
    ];
    const res = validateNoOverlaps(nodes, LAYOUT_TOKENS);
    
    expect(res.hasOverlaps).toBe(false);
    expect(res.overlaps).toHaveLength(0);
  });

  it('detects overlaps for coincident nodes', () => {
    const nodes: V3Node[] = [
      { id: 'n1', type: 'requirement', data: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'requirement', data: {}, position: { x: 0, y: 0 } },
    ];
    const res = validateNoOverlaps(nodes, LAYOUT_TOKENS);
    
    expect(res.hasOverlaps).toBe(true);
    expect(res.overlaps.length).toBeGreaterThan(0);
    expect(res.overlaps[0]).toEqual({ a: 'n1', b: 'n2' });
  });
});

import { describe, it, expect } from 'vitest';
import { calculateLayout } from '../engine/layoutEngine';
import { computeRegions } from '../engine/regionManager';
import { resolveCollisions } from '../engine/collisionResolver';
import { validateNoOverlaps } from '../engine/overlapValidator';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

function randomNode(id: string): V3Node {
  const year = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4;
  const trackChoices: Array<'se' | 'ds' | undefined> = ['se', 'ds', undefined, undefined]; // weight toward 'any'
  const trackId = trackChoices[Math.floor(Math.random() * trackChoices.length)];
  
  return {
    id,
    type: Math.random() < 0.1 ? 'gate' : 'requirement',
    data: { year, programId: 'bs_cs', trackId },
    position: { x: 0, y: 0 }
  };
}

describe('fuzz tests', () => {
  it('resolves 200 random nodes without overlaps (25 runs)', () => {
    for (let run = 0; run < 25; run++) {
      const nodes: V3Node[] = Array.from({ length: 200 }, (_, i) => randomNode(`node-${run}-${i}`));
      
      const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
      const regions = computeRegions(positioned, LAYOUT_TOKENS);
      const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);
      
      const result = validateNoOverlaps(resolved, LAYOUT_TOKENS);
      
      if (result.hasOverlaps) {
        console.error(`Run ${run} failed with ${result.overlaps.length} overlaps:`);
        console.table(result.overlaps.slice(0, 6).map(({a, b}) => {
          const A = resolved.find(n => n.id === a)!;
          const B = resolved.find(n => n.id === b)!;
          return {
            pair: `${a} ↔ ${b}`,
            Ax: `${A.position.x}..${A.position.x + LAYOUT_TOKENS.NODE_WIDTH}`,
            Bx: `${B.position.x}..${B.position.x + LAYOUT_TOKENS.NODE_WIDTH}`,
            Ay: `${A.position.y}..${A.position.y + LAYOUT_TOKENS.NODE_MAX_HEIGHT}`,
            By: `${B.position.y}..${B.position.y + LAYOUT_TOKENS.NODE_MAX_HEIGHT}`
          };
        }));
      }
      
      expect(result.hasOverlaps).toBe(false);
    }
  });

  it('handles edge case: all nodes in same year/track', () => {
    const nodes: V3Node[] = Array.from({ length: 50 }, (_, i) => ({
      id: `same-${i}`,
      type: 'requirement',
      data: { year: 3, programId: 'bs_cs', trackId: 'se' },
      position: { x: 0, y: 0 }
    }));
    
    const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
    const regions = computeRegions(positioned, LAYOUT_TOKENS);
    const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);
    
    const result = validateNoOverlaps(resolved, LAYOUT_TOKENS);
    expect(result.hasOverlaps).toBe(false);
    
    // All should be vertically stacked
    const sortedY = resolved.map(n => n.position.y).sort((a, b) => a - b);
    for (let i = 1; i < sortedY.length; i++) {
      expect(sortedY[i]).toBeGreaterThanOrEqual(
        sortedY[i - 1] + LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP
      );
    }
  });

  it('handles mixed gates and tracks in same year', () => {
    const nodes: V3Node[] = [];
    
    for (let i = 0; i < 20; i++) {
      nodes.push({
        id: `gate-${i}`,
        type: 'gate',
        data: { year: 3, programId: 'bs_cs' },
        position: { x: 0, y: 0 }
      });
      nodes.push({
        id: `se-${i}`,
        type: 'requirement',
        data: { year: 3, programId: 'bs_cs', trackId: 'se' },
        position: { x: 0, y: 0 }
      });
      nodes.push({
        id: `ds-${i}`,
        type: 'requirement',
        data: { year: 3, programId: 'bs_cs', trackId: 'ds' },
        position: { x: 0, y: 0 }
      });
    }
    
    const positioned = calculateLayout(nodes, LAYOUT_TOKENS);
    const regions = computeRegions(positioned, LAYOUT_TOKENS);
    const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);
    
    const result = validateNoOverlaps(resolved, LAYOUT_TOKENS);
    expect(result.hasOverlaps).toBe(false);
  });
});

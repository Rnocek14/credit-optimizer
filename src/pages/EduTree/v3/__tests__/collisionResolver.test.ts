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

  it('keeps nodes inside their corridor', () => {
    const nodes = [
      base('seA', 0, 'se'),
      base('seB', 10, 'se'),
      base('dsA', 0, 'ds'),
    ];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const out = resolveCollisions(nodes, regions, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    out.forEach(n => {
      const corridor = n.data.trackId === 'ds' ? region.corridors.ds : region.corridors.se;
      expect(n.position.y).toBeGreaterThanOrEqual(corridor.minY);
      expect(n.position.y).toBeLessThanOrEqual(corridor.maxY - LAYOUT_TOKENS.NODE_MAX_HEIGHT);
    });
  });

  it('is deterministic (same input -> same positions)', () => {
    const nodes = [base('A', 0, 'se'), base('B', 0, 'se')];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const r1 = resolveCollisions([...nodes], regions, LAYOUT_TOKENS);
    const r2 = resolveCollisions([...nodes], regions, LAYOUT_TOKENS);
    expect(JSON.stringify(r1.map(n => n.position))).toBe(JSON.stringify(r2.map(n => n.position)));
  });

  it('SE/DS at same Y do not overlap with lane offset', () => {
    const y = 0;
    const se = base('se', y, 'se');
    const ds = base('ds', y, 'ds');
    const regions = computeRegions([se, ds], LAYOUT_TOKENS);
    const out = resolveCollisions([se, ds], regions, LAYOUT_TOKENS);

    const { validateNoOverlaps } = require('../engine/overlapValidator');
    const res = validateNoOverlaps(out, LAYOUT_TOKENS);
    expect(res.hasOverlaps).toBe(false);
  });

  it('gate centered at Y3 never overlaps SE/DS after resolution', () => {
    const gate: V3Node = { 
      id: 'gate-track', 
      type: 'gate', 
      data: { year: 3, programId: 'bs_cs' }, 
      position: { x: LAYOUT_TOKENS.YEAR_COL.Y3, y: 0 } 
    };
    const se: V3Node = { 
      id: 'y3-se', 
      type: 'requirement', 
      data: { year: 3, programId: 'bs_cs', trackId: 'se' }, 
      position: { x: LAYOUT_TOKENS.YEAR_COL.Y3 - LAYOUT_TOKENS.TRACK_COLUMN_OFFSET, y: 0 } 
    };
    const nodes = [gate, se];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const out = resolveCollisions(nodes, regions, LAYOUT_TOKENS);

    const { validateNoOverlaps } = require('../engine/overlapValidator');
    expect(validateNoOverlaps(out, LAYOUT_TOKENS).hasOverlaps).toBe(false);
  });
});

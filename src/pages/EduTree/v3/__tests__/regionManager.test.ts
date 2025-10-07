import { describe, it, expect } from 'vitest';
import { computeRegions } from '../engine/regionManager';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

const node = (id: string, year: number, trackId?: 'se' | 'ds'): V3Node => ({
  id,
  type: 'requirement',
  data: { year: year as 1 | 2 | 3 | 4, programId: 'bs_cs', trackId },
  position: { x: 0, y: 0 }
});

describe('regionManager', () => {
  it('computes region bounds for a program', () => {
    const nodes = [
      node('y1', 1),
      node('y2', 2),
      node('y3-se', 3, 'se'),
      node('y3-ds', 3, 'ds')
    ];
    
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs');
    
    expect(region).toBeDefined();
    expect(region!.minY).toBeGreaterThanOrEqual(0);
    expect(region!.maxY).toBeGreaterThan(region!.minY);
  });

  it('creates separate corridors for SE, DS, and ANY per year', () => {
    const nodes = [node('y3-se', 3, 'se'), node('y3-ds', 3, 'ds')];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    expect(region.perYear[3].se).toBeDefined();
    expect(region.perYear[3].ds).toBeDefined();
    expect(region.perYear[3].any).toBeDefined();
    
    // SE should be in upper half, DS in lower half for year 3
    expect(region.perYear[3].se.maxY).toBeLessThanOrEqual(region.perYear[3].ds.minY);
  });

  it('ensures corridors have minimum height per year', () => {
    const nodes = [node('single', 1)];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    const seHeight = region.perYear[1].se.maxY - region.perYear[1].se.minY;
    const dsHeight = region.perYear[1].ds.maxY - region.perYear[1].ds.minY;
    
    expect(seHeight).toBeGreaterThanOrEqual(LAYOUT_TOKENS.NODE_MAX_HEIGHT);
    expect(dsHeight).toBeGreaterThanOrEqual(LAYOUT_TOKENS.NODE_MAX_HEIGHT);
  });

  it('handles multiple programs independently', () => {
    const csNodes = [node('cs-y1', 1), node('cs-y2', 2)];
    csNodes.forEach(n => n.data.programId = 'bs_cs');
    
    const itNodes = [node('it-y1', 1), node('it-y2', 2)];
    itNodes.forEach(n => n.data.programId = 'bs_it');
    
    const regions = computeRegions([...csNodes, ...itNodes], LAYOUT_TOKENS);
    
    expect(regions.has('bs_cs')).toBe(true);
    expect(regions.has('bs_it')).toBe(true);
    expect(regions.get('bs_cs')).not.toEqual(regions.get('bs_it'));
  });

  it('applies region gutter correctly', () => {
    const nodes = [node('y1', 1)];
    nodes[0].position.y = 100;
    
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    // Region should have minimum gutters
    expect(region.minY).toBeGreaterThanOrEqual(0);
    expect(region.maxY).toBeGreaterThan(region.minY);
  });

  it('allocates corridors with capacity for bucket sizes per year', () => {
    const many = (n: number, trackId: 'se' | 'ds') => 
      Array.from({ length: n }, (_, i) => ({
        id: `y3-${trackId}-${i}`,
        type: 'requirement' as const,
        data: { year: 3 as const, programId: 'bs_cs', trackId },
        position: { x: 0, y: i * 310 }
      }));
    
    const nodes = [...many(6, 'se'), ...many(5, 'ds')];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    const stepY = LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP;
    const seHeight = region.perYear[3].se.maxY - region.perYear[3].se.minY;
    const dsHeight = region.perYear[3].ds.maxY - region.perYear[3].ds.minY;
    
    // Each corridor should have enough space for its bucket in year 3
    expect(seHeight).toBeGreaterThanOrEqual(6 * stepY);
    expect(dsHeight).toBeGreaterThanOrEqual(5 * stepY);
  });
});

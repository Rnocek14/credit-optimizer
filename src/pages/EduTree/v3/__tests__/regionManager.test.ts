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

  it('creates separate corridors for SE, DS, and ANY', () => {
    const nodes = [node('y3-se', 3, 'se'), node('y3-ds', 3, 'ds')];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    expect(region.corridors.se).toBeDefined();
    expect(region.corridors.ds).toBeDefined();
    expect(region.corridors.any).toBeDefined();
    
    // SE should be in upper half, DS in lower half
    expect(region.corridors.se.maxY).toBeLessThanOrEqual(region.corridors.ds.minY);
  });

  it('ensures corridors have minimum height', () => {
    const nodes = [node('single', 1)];
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const region = regions.get('bs_cs')!;
    
    const seHeight = region.corridors.se.maxY - region.corridors.se.minY;
    const dsHeight = region.corridors.ds.maxY - region.corridors.ds.minY;
    
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
    
    // MinY should be node.y - REGION_GUTTER
    expect(region.minY).toBeLessThanOrEqual(100);
    expect(100 - region.minY).toBeLessThanOrEqual(LAYOUT_TOKENS.REGION_GUTTER);
  });
});

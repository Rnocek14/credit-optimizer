import { describe, it, expect } from 'vitest';
import { computeRegions } from '../regionManager';
import { LAYOUT_TOKENS } from '../../utils/layoutTokensV3';
import { V3Node } from '../../types/v3';

describe('regionManager', () => {
  it('corridor height >= bucket size * stepY', () => {
    const stepY = LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP;
    
    // Create test nodes with known bucket sizes
    const nodes: V3Node[] = [
      // Y3 SE track: 3 nodes
      { id: 'y3-se-1', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se' }, position: { x: 0, y: 0 } },
      { id: 'y3-se-2', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se' }, position: { x: 0, y: 0 } },
      { id: 'y3-se-3', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se' }, position: { x: 0, y: 0 } },
      // Y3 DS track: 2 nodes
      { id: 'y3-ds-1', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'ds' }, position: { x: 0, y: 0 } },
      { id: 'y3-ds-2', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'ds' }, position: { x: 0, y: 0 } },
      // Y1 any: 2 nodes
      { id: 'y1-1', type: 'requirement', data: { year: 1, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
      { id: 'y1-2', type: 'requirement', data: { year: 1, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
    ];
    
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const bscsRegion = regions.get('bs_cs');
    
    expect(bscsRegion).toBeDefined();
    
    if (bscsRegion) {
      // Y3 SE corridor should fit 3 nodes
      const seY3 = bscsRegion.perYear[3].se;
      const seHeight = seY3.maxY - seY3.minY;
      expect(seHeight).toBeGreaterThanOrEqual(3 * stepY);
      
      // Y3 DS corridor should fit 2 nodes
      const dsY3 = bscsRegion.perYear[3].ds;
      const dsHeight = dsY3.maxY - dsY3.minY;
      expect(dsHeight).toBeGreaterThanOrEqual(2 * stepY);
      
      // Y1 any corridor should fit 2 nodes
      const anyY1 = bscsRegion.perYear[1].any;
      const anyHeight = anyY1.maxY - anyY1.minY;
      expect(anyHeight).toBeGreaterThanOrEqual(2 * stepY);
    }
  });

  it('corridors are vertically stacked per year without overlap', () => {
    const nodes: V3Node[] = [
      { id: 'y1-1', type: 'requirement', data: { year: 1, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
      { id: 'y2-1', type: 'requirement', data: { year: 2, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
      { id: 'y3-se', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se' }, position: { x: 0, y: 0 } },
      { id: 'y4-1', type: 'requirement', data: { year: 4, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
    ];
    
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const bscsRegion = regions.get('bs_cs');
    
    expect(bscsRegion).toBeDefined();
    
    if (bscsRegion) {
      // Each year's 'any' corridor should not overlap with the next year
      const y1Max = bscsRegion.perYear[1].any.maxY;
      const y2Min = bscsRegion.perYear[2].any.minY;
      const y2Max = bscsRegion.perYear[2].any.maxY;
      const y3Min = bscsRegion.perYear[3].any.minY;
      const y3Max = bscsRegion.perYear[3].any.maxY;
      const y4Min = bscsRegion.perYear[4].any.minY;
      
      expect(y1Max).toBeLessThanOrEqual(y2Min);
      expect(y2Max).toBeLessThanOrEqual(y3Min);
      expect(y3Max).toBeLessThanOrEqual(y4Min);
    }
  });

  it('SE and DS lanes within year do not overlap', () => {
    const nodes: V3Node[] = [
      { id: 'y3-se-1', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se' }, position: { x: 0, y: 0 } },
      { id: 'y3-ds-1', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'ds' }, position: { x: 0, y: 0 } },
    ];
    
    const regions = computeRegions(nodes, LAYOUT_TOKENS);
    const bscsRegion = regions.get('bs_cs');
    
    expect(bscsRegion).toBeDefined();
    
    if (bscsRegion) {
      const seCorridor = bscsRegion.perYear[3].se;
      const dsCorridor = bscsRegion.perYear[3].ds;
      
      // DS corridor starts after SE corridor ends
      expect(dsCorridor.minY).toBeGreaterThan(seCorridor.maxY);
      
      // Verify gutter spacing
      const gap = dsCorridor.minY - seCorridor.maxY;
      expect(gap).toBeGreaterThanOrEqual(LAYOUT_TOKENS.TRACK_GUTTER);
    }
  });
});

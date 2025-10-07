import { describe, it, expect } from 'vitest';
import { calculateLayout } from '../engine/layoutEngine';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

const node = (id: string, year: 1 | 2 | 3 | 4): V3Node =>
  ({ id, type: 'requirement', data: { year }, position: { x: 0, y: 0 } });

describe('layoutEngine', () => {
  it('assigns correct X for each year', () => {
    const nodes = [node('y1', 1), node('y2', 2), node('y3', 3), node('y4', 4)];
    const out = calculateLayout(nodes, LAYOUT_TOKENS);
    
    expect(out[0]?.position.x).toBe(LAYOUT_TOKENS.YEAR_COL.Y1);
    expect(out[1]?.position.x).toBe(LAYOUT_TOKENS.YEAR_COL.Y2);
    expect(out[2]?.position.x).toBe(LAYOUT_TOKENS.YEAR_COL.Y3);
    expect(out[3]?.position.x).toBe(LAYOUT_TOKENS.YEAR_COL.Y4);
  });

  it('snaps positions to grid', () => {
    const nodes = [node('y1', 1)];
    const out = calculateLayout(nodes, LAYOUT_TOKENS);
    
    expect(out[0]?.position.x % LAYOUT_TOKENS.GRID).toBe(0);
    expect(out[0]?.position.y % LAYOUT_TOKENS.GRID).toBe(0);
  });

  it('applies track lane offsets at Y3', () => {
    const nodeWithTrack = (id: string, trackId?: 'se' | 'ds'): V3Node => 
      ({ id, type: 'requirement', data: { year: 3, trackId }, position: { x: 0, y: 0 } });
    
    const se = nodeWithTrack('y3-se', 'se');
    const ds = nodeWithTrack('y3-ds', 'ds');
    const out = calculateLayout([se, ds], LAYOUT_TOKENS);
    
    expect(out.find(n => n.id === 'y3-se')?.position.x)
      .toBe(LAYOUT_TOKENS.YEAR_COL.Y3 - LAYOUT_TOKENS.TRACK_COLUMN_OFFSET);
    expect(out.find(n => n.id === 'y3-ds')?.position.x)
      .toBe(LAYOUT_TOKENS.YEAR_COL.Y3 + LAYOUT_TOKENS.TRACK_COLUMN_OFFSET);
  });

  it('stacks multiple nodes in same bucket deterministically', () => {
    const many = (n: number, trackId: 'se' | 'ds') => 
      Array.from({ length: n }, (_, i) => ({
        id: `y3-${trackId}-${i}`,
        type: 'requirement' as const,
        data: { year: 3 as const, programId: 'bs_cs', trackId },
        position: { x: 0, y: 0 }
      }));
    
    const nodes = [...many(6, 'se'), ...many(5, 'ds')];
    const out = calculateLayout(nodes, LAYOUT_TOKENS);
    
    // Verify Y positions are stacked with proper spacing
    const seNodes = out.filter(n => n.data.trackId === 'se').sort((a, b) => a.position.y - b.position.y);
    const dsNodes = out.filter(n => n.data.trackId === 'ds').sort((a, b) => a.position.y - b.position.y);
    
    const stepY = LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP;
    
    seNodes.forEach((n, i) => {
      expect(n.position.y).toBe(i * stepY);
    });
    
    dsNodes.forEach((n, i) => {
      expect(n.position.y).toBe(i * stepY);
    });
  });

  it('gates and bundles are on strict lane centers', () => {
    const snap = (n: number) => Math.round(n / LAYOUT_TOKENS.GRID) * LAYOUT_TOKENS.GRID;
    
    const mixedNodes: V3Node[] = [
      { id: 'y1-req', type: 'requirement', data: { year: 1, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
      { id: 'gate1', type: 'gate', data: { year: 1, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
      { id: 'y3-se', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se' }, position: { x: 0, y: 0 } },
      { id: 'y3-ds', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'ds' }, position: { x: 0, y: 0 } },
      { id: 'gate2', type: 'gate', data: { year: 2, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
    ];
    
    const out = calculateLayout(mixedNodes, LAYOUT_TOKENS);
    
    for (const n of out) {
      const baseX = (LAYOUT_TOKENS.YEAR_COL as any)[`Y${n.data.year ?? 1}`] ?? LAYOUT_TOKENS.YEAR_COL.Y1;
      const expected =
        n.type === 'gate' || !n.data.trackId ? snap(baseX) :
        n.data.trackId === 'se' ? snap(baseX - LAYOUT_TOKENS.TRACK_COLUMN_OFFSET) :
                                   snap(baseX + LAYOUT_TOKENS.TRACK_COLUMN_OFFSET);
      
      expect(n.position.x).toBe(expected);
      
      // Gates should have anchorX set
      if (n.type === 'gate') {
        expect(n.data.anchorX).toBe(expected);
      }
    }
  });

  it('gates are positioned in vertical slots between year groups', () => {
    const gates: V3Node[] = [
      { id: 'programGate', type: 'gate', data: { year: 1, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
      { id: 'trackGate', type: 'gate', data: { year: 2, programId: 'bs_cs' }, position: { x: 0, y: 0 } },
    ];
    
    const out = calculateLayout(gates, LAYOUT_TOKENS);
    const stepY = LAYOUT_TOKENS.NODE_MAX_HEIGHT + LAYOUT_TOKENS.LANE_GAP;
    
    const programGate = out.find(n => n.id === 'programGate');
    const trackGate = out.find(n => n.id === 'trackGate');
    
    // Program gate (Y1) at 1.5 * stepY
    expect(programGate?.position.y).toBe(Math.round(stepY * 1.5 / LAYOUT_TOKENS.GRID) * LAYOUT_TOKENS.GRID);
    
    // Track gate (Y2) at 3.5 * stepY
    expect(trackGate?.position.y).toBe(Math.round(stepY * 3.5 / LAYOUT_TOKENS.GRID) * LAYOUT_TOKENS.GRID);
  });
});

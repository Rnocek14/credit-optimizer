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
});

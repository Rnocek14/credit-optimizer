import { V3Node } from '../types/v3';

type Corridor = { minY: number; maxY: number };

export type ProgramRegion = { 
  minY: number; 
  maxY: number; 
  corridors: Record<'se' | 'ds' | 'any', Corridor>; 
};

export function computeRegions(
  nodes: V3Node[],
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): Map<string, ProgramRegion> {
  const byProgram = new Map<string, V3Node[]>();
  
  for (const n of nodes) {
    const pid = n.data.programId ?? 'unknown';
    if (!byProgram.has(pid)) byProgram.set(pid, []);
    byProgram.get(pid)!.push(n);
  }

  const regions = new Map<string, ProgramRegion>();
  
  for (const [pid, arr] of byProgram.entries()) {
    let minY = Infinity, maxY = -Infinity;
    
    for (const n of arr) {
      minY = Math.min(minY, n.position.y);
      maxY = Math.max(maxY, n.position.y);
    }
    
    if (!isFinite(minY)) minY = 0;
    if (!isFinite(maxY)) maxY = 0;

    minY = Math.max(0, minY - t.REGION_GUTTER);
    maxY = maxY + t.REGION_GUTTER + t.NODE_MAX_HEIGHT;

    const total = Math.max(t.NODE_MAX_HEIGHT * 2 + t.TRACK_GUTTER * 4, maxY - minY);
    const mid = minY + total / 2;

    regions.set(pid, {
      minY, 
      maxY,
      corridors: {
        se:  { minY: minY + t.TRACK_GUTTER, maxY: mid - t.TRACK_GUTTER },
        ds:  { minY: mid  + t.TRACK_GUTTER, maxY: maxY - t.TRACK_GUTTER },
        any: { minY: minY + t.TRACK_GUTTER, maxY: maxY - t.TRACK_GUTTER }
      }
    });
  }
  
  return regions;
}

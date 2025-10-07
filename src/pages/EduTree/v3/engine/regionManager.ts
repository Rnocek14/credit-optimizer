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

  const stepY = t.NODE_MAX_HEIGHT + t.LANE_GAP;
  const regions = new Map<string, ProgramRegion>();
  
  for (const [pid, arr] of byProgram.entries()) {
    // Count nodes by track across all years to ensure corridors have capacity
    const counts = { se: 0, ds: 0, any: 0 };
    for (const n of arr) {
      const tk = (n.type === 'gate' || !n.data.trackId ? 'any' : n.data.trackId) as 'se' | 'ds' | 'any';
      counts[tk] = (counts[tk] ?? 0) + 1;
    }

    // Calculate required space for each track
    const neededSe = Math.max(1, counts.se) * stepY;
    const neededDs = Math.max(1, counts.ds) * stepY;
    const needed = neededSe + t.TRACK_GUTTER + neededDs;

    const minY = 0;
    const maxY = needed + t.REGION_GUTTER * 2;

    regions.set(pid, {
      minY, 
      maxY,
      corridors: {
        se:  { 
          minY: minY + t.REGION_GUTTER, 
          maxY: minY + t.REGION_GUTTER + neededSe 
        },
        ds:  { 
          minY: minY + t.REGION_GUTTER + neededSe + t.TRACK_GUTTER,
          maxY: minY + t.REGION_GUTTER + neededSe + t.TRACK_GUTTER + neededDs 
        },
        any: { 
          minY: minY + t.TRACK_GUTTER, 
          maxY: maxY - t.TRACK_GUTTER 
        }
      }
    });
  }
  
  return regions;
}

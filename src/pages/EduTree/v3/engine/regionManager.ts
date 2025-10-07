import { V3Node } from '../types/v3';

type Corridor = { minY: number; maxY: number };

export type ProgramRegion = { 
  minY: number; 
  maxY: number; 
  perYear: Record<number, {
    se: Corridor;
    ds: Corridor;
    any: Corridor;
  }>;
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
  
  for (const [pid, group] of byProgram.entries()) {
    // Count nodes by year + track for exact capacity allocation
    const count: Record<1 | 2 | 3 | 4, { se: number; ds: number; any: number }> = {
      1: { se: 0, ds: 0, any: 0 },
      2: { se: 0, ds: 0, any: 0 },
      3: { se: 0, ds: 0, any: 0 },
      4: { se: 0, ds: 0, any: 0 }
    };
    
    for (const n of group) {
      const year = (n.data.year ?? 1) as 1 | 2 | 3 | 4;
      const lane = (n.type === 'gate' || !n.data.trackId) ? 'any' : n.data.trackId as 'se' | 'ds';
      count[year][lane] += 1;
    }

    // Allocate per-year corridors vertically stacked (no cross-year collisions)
    let cursor: number = t.REGION_GUTTER; // top of region
    const perYear: Record<number, { se: Corridor; ds: Corridor; any: Corridor }> = {};

    ([1, 2, 3, 4] as const).forEach(year => {
      const needSe = Math.max(1, count[year].se) * stepY;
      const needDs = Math.max(1, count[year].ds) * stepY;
      const gutter = t.TRACK_GUTTER;

      const yearBlockHeight = needSe + gutter + needDs + 2 * t.REGION_GUTTER;
      const top = cursor;
      const bottom = top + yearBlockHeight;

      perYear[year] = {
        se: { 
          minY: top + t.REGION_GUTTER, 
          maxY: top + t.REGION_GUTTER + needSe 
        },
        ds: { 
          minY: top + t.REGION_GUTTER + needSe + gutter,
          maxY: top + t.REGION_GUTTER + needSe + gutter + needDs 
        },
        any: { 
          minY: top + t.TRACK_GUTTER, 
          maxY: bottom - t.TRACK_GUTTER 
        }
      };

      cursor = bottom; // next year starts below
    });

    regions.set(pid, { 
      minY: 0 as number, 
      maxY: cursor + t.REGION_GUTTER as number, 
      perYear 
    });
  }
  
  return regions;
}

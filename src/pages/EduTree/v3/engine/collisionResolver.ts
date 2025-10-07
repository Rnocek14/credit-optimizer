import { V3Node } from '../types/v3';
import type { ProgramRegion } from './regionManager';
import { snap } from './layoutEngine';

const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

export function resolveCollisions(
  nodes: V3Node[],
  regions: Map<string, ProgramRegion>,
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): V3Node[] {
  const out = nodes.map(n => ({ ...n }));

  // bucket by column + program + track
  type Key = string;
  const groups = new Map<Key, V3Node[]>();

  const bucketX = (x: number) => Math.round(x / t.COL_TOLERANCE) * t.COL_TOLERANCE;

  for (const n of out) {
    const col = bucketX(n.position.x);
    const pid = String(n.data.programId ?? 'unknown');
    const tid = String(n.data.trackId ?? 'any');
    const key = `${col}|${pid}|${tid}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  groups.forEach((arr, key) => {
    arr.sort((a, b) => a.position.y - b.position.y);

    const [, programId, trackKey] = key.split('|');
    const region = regions.get(programId);

    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const curr = arr[i];

      const minY = prev.position.y + t.NODE_MAX_HEIGHT + t.LANE_GAP;
      if (curr.position.y < minY) curr.position.y = minY;

      // Clamp to per-year corridor
      if (region?.perYear) {
        const year = (curr.data.year ?? 1) as 1 | 2 | 3 | 4;
        const lane = trackKey as 'se' | 'ds' | 'any';
        const corridor = region.perYear[year]?.[lane];
        
        if (corridor) {
          if (curr.position.y < corridor.minY) curr.position.y = corridor.minY;
          if (curr.position.y > corridor.maxY - t.NODE_MAX_HEIGHT) {
            curr.position.y = corridor.maxY - t.NODE_MAX_HEIGHT;
          }
        }
      }
    }
  });

  // No horizontal nudging needed - lanes are strictly enforced at layout time
  // Collision resolution is vertical-only with corridor clamping

  // Gate anchoring is enforced at layout time - no horizontal adjustments needed here

  // Final pass: ensure all nodes are on their lane centers (no drift allowed)
  for (const n of out) {
    // Gates must stay at center
    if (n.type === 'gate' || n.id?.includes('gate')) {
      if (typeof n.data.anchorX === 'number') {
        n.position.x = snap(n.data.anchorX, t.GRID);
      }
    } else {
      // Track nodes must stay on their lane centers
      const year = n.data.year ?? 1;
      const baseX = (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;
      const lane = n.data.trackId === 'se' ? 'se' : n.data.trackId === 'ds' ? 'ds' : 'any';
      
      const expectedX = 
        lane === 'se' ? snap(baseX - t.TRACK_COLUMN_OFFSET, t.GRID) :
        lane === 'ds' ? snap(baseX + t.TRACK_COLUMN_OFFSET, t.GRID) :
        snap(baseX, t.GRID);
      
      // Dev-only assertion: detect drift
      if (import.meta?.env?.DEV && Math.abs(n.position.x - expectedX) > t.GRID / 2) {
        console.warn(`[V3 Collision] X drift detected for ${n.id}: ${n.position.x} → ${expectedX}`);
      }
      
      n.position.x = expectedX;
    }
  }

  return out;
}

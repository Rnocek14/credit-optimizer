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
    const corridor = region?.corridors?.[trackKey as 'se' | 'ds' | 'any'] ?? region?.corridors?.any;

    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const curr = arr[i];

      const minY = prev.position.y + t.NODE_MAX_HEIGHT + t.LANE_GAP;
      if (curr.position.y < minY) curr.position.y = minY;

      // clamp to corridor
      if (corridor) {
        if (curr.position.y < corridor.minY) curr.position.y = corridor.minY;
        if (curr.position.y > corridor.maxY - t.NODE_MAX_HEIGHT) {
          curr.position.y = corridor.maxY - t.NODE_MAX_HEIGHT;
        }
      }
    }
  });

  // No horizontal nudging needed - lanes are strictly enforced at layout time
  // Collision resolution is vertical-only with corridor clamping

  // Gate anchoring is enforced at layout time - no horizontal adjustments needed here

  // Final pass: snap gates back to their anchor positions
  for (const n of out) {
    if ((n.type === 'gate' || n.id?.includes('gate')) && typeof n.data.anchorX === 'number') {
      n.position.x = snap(n.data.anchorX, t.GRID);
    }
  }

  return out;
}

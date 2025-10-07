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

  // guarantee minimum horizontal spacing if same year band (skip gates - they're anchored)
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      
      // Skip gates - they're handled by fork-group rule
      if (a.type === 'gate' || b.type === 'gate') continue;
      
      const sameYear = (a.data.year ?? 0) === (b.data.year ?? 0);
      if (!sameYear) continue;

      const minDX = t.NODE_WIDTH + t.H_GAP; // 204px
      const dx = b.position.x - a.position.x;

      if (Math.abs(dx) < minDX) {
        // Push the one on the right further right by the shortfall (snapped)
        const push = snap(minDX - Math.abs(dx), t.GRID);
        if (dx >= 0) b.position.x += push;
        else a.position.x -= push;
      }
    }
  }

  // Ensure "any" (gates) never collide with track nodes in same year fork group
  const yearBaseX = (year: number) => (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;
  
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      const year = a.data.year ?? b.data.year ?? 0;
      const sameYear = (a.data.year ?? 0) === (b.data.year ?? 0);
      if (!sameYear || !year) continue;

      const aAny = (a.data.trackId ?? 'any') === 'any';
      const bAny = (b.data.trackId ?? 'any') === 'any';
      if (!((aAny && !bAny) || (!aAny && bAny))) continue; // XOR: gate vs track only

      // Consider them in the same fork group if both are within the fork band around baseX
      const baseX = yearBaseX(year);
      const inForkBand = (x: number) => Math.abs(x - baseX) <= (t.TRACK_COLUMN_OFFSET + t.GRID);
      if (!(inForkBand(a.position.x) && inForkBand(b.position.x))) continue;

      // Identify which is gate, which is track
      const gateNode = aAny ? a : b;
      const trackNode = aAny ? b : a;

      // Minimum separation requirements
      const minLaneDX = t.TRACK_COLUMN_OFFSET;  // 120
      const minNodeDX = t.NODE_WIDTH + t.H_GAP; // 204

      // 1) Push track to its proper lane if it drifted too close to center
      const dxFromBase = trackNode.position.x - baseX;
      if (Math.abs(dxFromBase) < minLaneDX) {
        const dir = (trackNode.data.trackId === 'ds') ? +1 : -1;
        const need = snap(minLaneDX - Math.abs(dxFromBase), t.GRID);
        trackNode.position.x += dir * need;
      }

      // 2) Ensure gate <-> track clearance (only move track, gate stays anchored)
      const needDx = minNodeDX - Math.abs(trackNode.position.x - gateNode.position.x);
      if (needDx > 0) {
        const dir = (trackNode.position.x > gateNode.position.x) ? +1 : -1;
        trackNode.position.x += snap(needDx, t.GRID) * dir;
      }
    }
  }

  // Final pass: snap gates back to their anchor positions
  for (const n of out) {
    if ((n.type === 'gate' || n.id?.includes('gate')) && typeof n.data.anchorX === 'number') {
      n.position.x = snap(n.data.anchorX, t.GRID);
    }
  }

  return out;
}

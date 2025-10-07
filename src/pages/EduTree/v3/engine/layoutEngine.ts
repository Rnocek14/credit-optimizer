import { V3Node } from '../types/v3';

export function snap(n: number, unit: number) {
  return Math.round(n / unit) * unit;
}

export function calculateLayout(
  nodes: V3Node[], 
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): V3Node[] {
  const out = nodes.map(n => ({ ...n }));
  const stepY = t.NODE_MAX_HEIGHT + t.LANE_GAP;

  // Bucket by (program, year, track) for deterministic stacking
  const buckets = new Map<string, V3Node[]>();
  const bucketKey = (n: V3Node) => {
    const pid = n.data.programId ?? 'unknown';
    const year = n.data.year ?? 1;
    const trackKey = n.type === 'gate' || !n.data.trackId ? 'any' : n.data.trackId;
    return `${pid}|Y${year}|${trackKey}`;
  };

  for (const n of out) {
    const key = bucketKey(n);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(n);
  }

  // Assign X and stacked Y inside each bucket
  for (const [key, arr] of buckets) {
    const [, yStr, trackKey] = key.split('|');
    const year = Number(yStr.slice(1)) as 1 | 2 | 3 | 4;
    const baseX = (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;

    // Strict lane centers - no drift allowed
    const centers = {
      any: snap(baseX, t.GRID),
      se: snap(baseX - t.TRACK_COLUMN_OFFSET, t.GRID),
      ds: snap(baseX + t.TRACK_COLUMN_OFFSET, t.GRID),
    };

    // Stable sort to keep positions deterministic
    arr.sort((a, b) => a.id.localeCompare(b.id));

    arr.forEach((n, i) => {
      const lane = (n.type === 'gate' || !n.data.trackId) ? 'any' : n.data.trackId;
      n.position.x = centers[lane as 'any' | 'se' | 'ds'];
      n.position.y = snap(i * stepY, t.GRID);
      
      // Anchor gates at center so collision resolver never moves them horizontally
      if (n.type === 'gate' || n.id?.includes('gate')) {
        n.data.anchorX = centers.any;
      }
    });
  }
  
  return out;
}

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

  // Separate gates from bundles - gates need vertical spacing between year groups
  const gates = out.filter(n => n.type === 'gate' || n.id?.includes('gate'));
  const regularNodes = out.filter(n => n.type !== 'gate' && !n.id?.includes('gate'));

  // Bucket regular nodes by (program, year, track) for deterministic stacking
  const buckets = new Map<string, V3Node[]>();
  const bucketKey = (n: V3Node) => {
    const pid = n.data.programId ?? 'unknown';
    const year = n.data.year ?? 1;
    const trackKey = n.type === 'gate' || !n.data.trackId ? 'any' : n.data.trackId;
    return `${pid}|Y${year}|${trackKey}`;
  };

  for (const n of regularNodes) {
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
    });
  }

  // Position gates BETWEEN year bundles to prevent overlaps
  for (const gate of gates) {
    const year = gate.data.year ?? 1;
    const baseX = (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;
    const centerX = snap(baseX, t.GRID);
    
    // Place gates in vertical slots between year groups
    const gateY = year === 1 ? stepY * 1.5 : stepY * 3.5;
    
    gate.position.x = centerX;
    gate.position.y = snap(gateY, t.GRID);
    gate.data.anchorX = centerX;
  }
  
  return out;
}

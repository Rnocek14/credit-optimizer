import { V3Node } from '../types/v3';

export function snap(n: number, unit: number) {
  return Math.round(n / unit) * unit;
}

// Position enum for handle positions (matches ReactFlow)
export const Position = {
  Top: 'top',
  Bottom: 'bottom',
  Left: 'left',
  Right: 'right',
} as const;

export function calculateLayout(
  nodes: V3Node[], 
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): V3Node[] {
  const out = nodes.map(n => ({ ...n }));
  const stepY = t.NODE_MAX_HEIGHT + t.LANE_GAP;
  
  // Helper: year to row index (Y1=0, Y2=1, Y3=2, Y4=3)
  const yearRow = (year: 1 | 2 | 3 | 4) => year - 1;

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

  // Assign X and Y based on year rows (collapsed view: one bundle per year)
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
      
      // Use year-based rows for collapsed bundles (i=0 for single bundle per year)
      // If expanded: stack multiple nodes vertically
      const isCollapsedBundle = n.type === 'track-bundle';
      const rowY = yearRow(year) * stepY;
      
      // Y3 split: offset SE/DS tracks vertically for visual clarity
      let yOffset = 0;
      if (year === 3 && n.type === 'track-bundle' && n.data.trackId) {
        yOffset = n.data.trackId === 'se' ? -24 : 24; // ±24px from centerline
      }
      
      n.position.y = snap(rowY + yOffset + (isCollapsedBundle ? 0 : i * stepY), t.GRID);
      
      // Spine flow: horizontal left→right between years
      n.sourcePosition = Position.Right;
      n.targetPosition = Position.Left;
    });
  }

  // Position gates BETWEEN year rows (centered in gutter with proper height)
  for (const gate of gates) {
    const year = (gate.data.year ?? 1) as 1 | 2 | 3 | 4;
    const baseX = (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;
    const centerX = snap(baseX, t.GRID);
    
    // Place gate centered in the gutter: bottom of year row + (gutter - gate height) / 2
    const rowY = yearRow(year) * stepY;
    const gateY = rowY + t.NODE_MAX_HEIGHT + (t.LANE_GAP - t.GATE_HEIGHT) / 2;
    
    gate.position.x = centerX;
    gate.position.y = snap(gateY, t.GRID);
    gate.data.anchorX = centerX;
    
    // Gates connect vertically: bottom→top for year transitions
    gate.sourcePosition = Position.Bottom;
    gate.targetPosition = Position.Top;
  }
  
  return out;
}

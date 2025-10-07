import { V3Node } from '../types/v3';

export function snap(n: number, unit: number) {
  return Math.round(n / unit) * unit;
}

export function calculateLayout(
  nodes: V3Node[], 
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): V3Node[] {
  const out = nodes.map(n => ({ ...n }));
  
  for (const n of out) {
    const year = n.data.year ?? 1;
    const baseX = (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;
    
    // Apply track lane offset for SE/DS; gates stay centered
    const laneX =
      n.data.trackId === 'se' ? baseX - t.TRACK_COLUMN_OFFSET
    : n.data.trackId === 'ds' ? baseX + t.TRACK_COLUMN_OFFSET
    : baseX;
    
    n.position.x = snap(laneX, t.GRID);

    // Y seed: SE upper, DS lower, gates between
    const isGate = n.type === 'gate' || n.id?.includes('gate');
    
    if (isGate) {
      // Position gates vertically between SE and DS lanes
      n.position.y = snap(Math.floor((t.NODE_BASE_HEIGHT + t.LANE_GAP) * 0.5), t.GRID);
      // Anchor gates in X so collision resolver never moves them horizontally
      n.data.anchorX = n.position.x;
    } else {
      // Track-based stacking: SE upper (idx=0), DS lower (idx=1)
      const laneSeed = n.data.trackId === 'ds' ? 1 : 0;
      n.position.y = snap((t.NODE_BASE_HEIGHT + t.LANE_GAP) * laneSeed, t.GRID);
    }
  }
  
  return out;
}

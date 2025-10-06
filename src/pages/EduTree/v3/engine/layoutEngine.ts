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
    const x = (t.YEAR_COL as any)[`Y${year}`] ?? t.YEAR_COL.Y1;
    n.position.x = snap(x, t.GRID);

    // basic stacking by track corridor seed (upper/lower bias)
    const laneSeed = n.data.trackId === 'ds' ? 1 : 0;
    const idx = laneSeed; // Week 1 dummy packing (no hierarchy yet)
    n.position.y = snap((t.NODE_BASE_HEIGHT + t.LANE_GAP) * idx, t.GRID);
  }
  
  return out;
}

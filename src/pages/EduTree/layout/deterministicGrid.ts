import type { Node, Edge } from '@xyflow/react';

export type BlockLike = { 
  id: string | number; 
  slug?: string; 
  title?: string; 
  level_year?: number; 
  track_id?: string | null 
};

export type LayoutOpts = {
  laneHeight?: number;   // px between Y-lanes
  colWidth?: number;     // px between columns
  lanePaddingX?: number; // left padding per lane
  lanePaddingY?: number; // top padding
  // optional fixed column ordering by slug (strong hint)
  columnOrderBySlug?: Record<string, number>;
  // hard anchors for track positioning per lane
  trackAnchorsByLane?: { [lane: number]: { se?: number; ds?: number; sharedMax?: number } };
};

/**
 * Deterministic grid layout:
 * - Y-lane = level_year (1..4)
 * - Column index = topo-aware order within the same lane
 * - Shared blocks anchor columns; track blocks align to those columns when possible
 * - Same-level edges are OK (e.g., Architecture->Capstone in Y4)
 */
export function computeDeterministicGrid(
  blocks: BlockLike[],
  edges: { source: string | number; target: string | number }[],
  opts: LayoutOpts = {}
): Record<string, { x: number; y: number; col: number; lane: number }> {
  const laneH = opts.laneHeight ?? 200;
  const colW = opts.colWidth ?? 320;
  const padX = opts.lanePaddingX ?? 48;
  const padY = opts.lanePaddingY ?? 24;
  const byId = new Map(blocks.map(b => [String(b.id), b]));
  const byLane = new Map<number, BlockLike[]>();
  
  for (const b of blocks) {
    const ly = Math.max(1, Math.min(4, b.level_year ?? 1));
    (byLane.get(ly) ?? byLane.set(ly, []).get(ly)!).push(b);
  }

  // Pre-build adjacency (within-lane deps only for ordering)
  const outs = new Map<string, string[]>();
  const ins = new Map<string, string[]>();
  edges.forEach(e => {
    const s = String(e.source), t = String(e.target);
    (outs.get(s) ?? outs.set(s, []).get(s)!).push(t);
    (ins.get(t) ?? ins.set(t, []).get(t)!).push(s);
  });

  // Column index assignment per lane, deterministic:
  // 1) Seed by provided columnOrderBySlug (if any)
  // 2) Then prefer nodes with fewer in-lane prereqs earlier
  // 3) Stable tie-breaker: slug -> title -> id
  function rankLane(laneBlocks: BlockLike[], laneNo: number): Map<string, number> {
    const rank = new Map<string, number>();
    const fixed = opts.columnOrderBySlug ?? {};
    const isShared = (b: BlockLike) => !b.track_id;

    // Start with shared blocks left-to-right by fixed order (GE, Foundations, Math, Core I/II, Gate, etc.)
    const shared = laneBlocks.filter(isShared);
    shared.sort((a, b) => {
      const sa = fixed[a.slug ?? ''] ?? 9999;
      const sb = fixed[b.slug ?? ''] ?? 9999;
      if (sa !== sb) return sa - sb;
      const ta = (a.title ?? '').toLowerCase();
      const tb = (b.title ?? '').toLowerCase();
      return ta.localeCompare(tb) || String(a.id).localeCompare(String(b.id));
    });
    shared.forEach((b, i) => rank.set(String(b.id), i));

    // Track-specific next; compute in-lane indegree to keep prereqs left of dependents
    const track = laneBlocks.filter(b => !isShared(b));
    track.sort((a, b) => {
      const inA = (ins.get(String(a.id)) ?? []).filter(x => (byId.get(x)?.level_year ?? laneNo) === laneNo).length;
      const inB = (ins.get(String(b.id)) ?? []).filter(x => (byId.get(x)?.level_year ?? laneNo) === laneNo).length;
      if (inA !== inB) return inA - inB;
      // align SE left, DS right for overlay readability
      if ((a.track_id ?? '') !== (b.track_id ?? '')) {
        return (a.track_id === 'software-engineering') ? -1 : 1;
      }
      const sa = fixed[a.slug ?? ''] ?? 9999;
      const sb = fixed[b.slug ?? ''] ?? 9999;
      if (sa !== sb) return sa - sb;
      const ta = (a.title ?? '').toLowerCase();
      const tb = (b.title ?? '').toLowerCase();
      return ta.localeCompare(tb) || String(a.id).localeCompare(String(b.id));
    });

    let col = rank.size; // continue after shared
    track.forEach(b => {
      // Try to align with its dominant predecessor column (if same lane)
      const preds = (ins.get(String(b.id)) ?? []).filter(x => (byId.get(x)?.level_year ?? laneNo) === laneNo);
      let suggested = -1;
      if (preds.length) {
        const cols = preds.map(p => rank.get(String(p))).filter((c): c is number => c != null);
        suggested = cols.length ? Math.max(...cols) + 1 : -1;
      }
      rank.set(String(b.id), suggested >= 0 ? suggested : col++);
    });

    // Apply hard anchors if configured for this lane
    const anchors = opts.trackAnchorsByLane?.[laneNo];
    if (anchors) {
      // Apply sharedMax constraint
      if (typeof anchors.sharedMax === 'number') {
        shared.forEach(b => {
          const currentCol = rank.get(String(b.id)) ?? 0;
          if (currentCol > anchors.sharedMax!) {
            rank.set(String(b.id), anchors.sharedMax!);
          }
        });
      }
      
      // Snap SE tracks to anchor
      if (typeof anchors.se === 'number') {
        track.filter(b => b.track_id === 'software-engineering').forEach(b => {
          rank.set(String(b.id), anchors.se!);
        });
      }
      
      // Snap DS tracks to anchor  
      if (typeof anchors.ds === 'number') {
        track.filter(b => b.track_id === 'data-science').forEach(b => {
          rank.set(String(b.id), anchors.ds!);
        });
      }
    }

    return rank;
  }

  const layout: Record<string, { x: number; y: number; col: number; lane: number }> = {};
  for (let lane = 1; lane <= 4; lane++) {
    const laneBlocks = (byLane.get(lane) ?? []).slice();
    if (!laneBlocks.length) continue;
    const r = rankLane(laneBlocks, lane);
    laneBlocks.forEach(b => {
      const c = r.get(String(b.id)) ?? 0;
      layout[String(b.id)] = {
        col: c,
        lane,
        x: padX + c * colW,
        y: padY + (lane - 1) * laneH
      };
    });
  }
  return layout;
}

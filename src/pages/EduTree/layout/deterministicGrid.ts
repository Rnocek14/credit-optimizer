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
  // reserved columns that cannot be reassigned by collision packer
  reservedColsByLane?: { [lane: number]: number[] };
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
  const colW = opts.colWidth ?? 540;
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

    console.log(`[Layout] Processing Lane ${laneNo} with ${laneBlocks.length} blocks:`, laneBlocks.map(b => b.slug));
    console.log(`[Layout] Column order config:`, fixed);

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
    shared.forEach((b, i) => {
      rank.set(String(b.id), i);
      console.log(`[Layout] Shared block ${b.slug} -> column ${i}`);
    });

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
      // Check if block has absolute column position specified
      const absoluteCol = fixed[b.slug ?? ''];
      if (absoluteCol !== undefined && absoluteCol !== 9999) {
        console.log(`[Layout] Using absolute column for ${b.slug}: ${absoluteCol}`);
        rank.set(String(b.id), absoluteCol);
        return;
      }

      // Try to align with its dominant predecessor column (if same lane)
      const preds = (ins.get(String(b.id)) ?? []).filter(x => (byId.get(x)?.level_year ?? laneNo) === laneNo);
      let suggested = -1;
      if (preds.length) {
        const cols = preds.map(p => rank.get(String(p))).filter((c): c is number => c != null);
        suggested = cols.length ? Math.max(...cols) + 1 : -1;
      }
      const finalCol = suggested >= 0 ? suggested : col++;
      console.log(`[Layout] Track block ${b.slug} assigned to column ${finalCol} (suggested: ${suggested}, sequential: ${col-1})`);
      rank.set(String(b.id), finalCol);
    });

    // Apply hard anchors if configured for this lane
    const anchors = opts.trackAnchorsByLane?.[laneNo];
    if (anchors) {
      console.log(`[Layout] Lane ${laneNo} anchors:`, anchors);
      
      // Apply sharedMax constraint
      if (typeof anchors.sharedMax === 'number') {
        shared.forEach(b => {
          const currentCol = rank.get(String(b.id)) ?? 0;
          if (currentCol > anchors.sharedMax!) {
            console.log(`[Layout] Constraining shared block ${b.slug} from col ${currentCol} to ${anchors.sharedMax}`);
            rank.set(String(b.id), anchors.sharedMax!);
          }
        });
      }
      
      // Snap SE tracks to anchor
      if (typeof anchors.se === 'number') {
        const seNodes = track.filter(b => b.track_id === 'software-engineering');
        console.log(`[Layout] Anchoring ${seNodes.length} SE nodes to col ${anchors.se}:`, seNodes.map(n => n.slug));
        seNodes.forEach(b => {
          // Respect absolute column assignments from columnOrderBySlug
          const absoluteCol = fixed[b.slug ?? ''];
          if (absoluteCol !== undefined && absoluteCol !== 9999) {
            console.log(`[Layout] Hard anchor: skipping ${b.slug} - has absolute column ${absoluteCol}`);
            return;
          }
          rank.set(String(b.id), anchors.se!);
        });
      }
      
      // Snap DS tracks to anchor  
      if (typeof anchors.ds === 'number') {
        const dsNodes = track.filter(b => b.track_id === 'data-science');
        console.log(`[Layout] Anchoring ${dsNodes.length} DS nodes to col ${anchors.ds}:`, dsNodes.map(n => n.slug));
        dsNodes.forEach(b => {
          // Respect absolute column assignments from columnOrderBySlug
          const absoluteCol = fixed[b.slug ?? ''];
          if (absoluteCol !== undefined && absoluteCol !== 9999) {
            console.log(`[Layout] Hard anchor: skipping ${b.slug} - has absolute column ${absoluteCol}`);
            return;
          }
          rank.set(String(b.id), anchors.ds!);
        });
      }
    }

    // Enhanced bucket spacing: spread same-track nodes with Y-offset for divergence gate fan-out
    const anchorConfig = opts.trackAnchorsByLane?.[laneNo];
    if (anchorConfig) {
      // SE track spacing - deterministic sort then spread from anchor
      if (typeof anchorConfig.se === 'number') {
        const seNodes = track.filter(b => b.track_id === 'software-engineering');
        seNodes.sort((a, b) => (a.slug || '').localeCompare(b.slug || '') || String(a.id).localeCompare(String(b.id)));
        seNodes.forEach((node, idx) => {
          // Respect absolute column assignments from columnOrderBySlug
          const absoluteCol = fixed[node.slug ?? ''];
          if (absoluteCol !== undefined && absoluteCol !== 9999) {
            console.log(`[Layout] SE bucket spacing: skipping ${node.slug} - has absolute column ${absoluteCol}`);
            return;
          }
          
          const col = anchorConfig.se! + idx; // anchor + 0, anchor + 1, etc.
          rank.set(String(node.id), col);
          console.log(`[Layout] SE bucket spacing: ${node.slug} -> col ${col} (anchor=${anchorConfig.se}, idx=${idx})`);
        });
      }
      
      // DS track spacing - deterministic sort then spread from anchor
      if (typeof anchorConfig.ds === 'number') {
        const dsNodes = track.filter(b => b.track_id === 'data-science');
        dsNodes.sort((a, b) => (a.slug || '').localeCompare(b.slug || '') || String(a.id).localeCompare(String(b.id)));
        dsNodes.forEach((node, idx) => {
          // Respect absolute column assignments from columnOrderBySlug
          const absoluteCol = fixed[node.slug ?? ''];
          if (absoluteCol !== undefined && absoluteCol !== 9999) {
            console.log(`[Layout] DS bucket spacing: skipping ${node.slug} - has absolute column ${absoluteCol}`);
            return;
          }
          
          const col = anchorConfig.ds! + idx; // anchor + 0, anchor + 1, etc.
          rank.set(String(node.id), col);
          console.log(`[Layout] DS bucket spacing: ${node.slug} -> col ${col} (anchor=${anchorConfig.ds}, idx=${idx})`);
        });
      }
    }

    // Reserved column collision resolution - proper pinned/non-pinned separation
    const reserved = new Set(opts.reservedColsByLane?.[laneNo] ?? []);
    const ids = laneBlocks.map(b => String(b.id));

    // Identify pinned nodes (those that should stay in reserved columns)
    const pinned = new Set<string>();
    ids.forEach(id => {
      const c = rank.get(id) ?? 0;
      if (reserved.has(c)) pinned.add(id);
    });

    // Process pinned first (lock their reserved columns), then pack non-pinned around them
    const used = new Set<number>();
    
    // Lock pinned nodes in their reserved columns
    ids.filter(id => pinned.has(id))
       .sort((a, b) => (rank.get(a)! - rank.get(b)!))
       .forEach(id => {
         const c = rank.get(id)!;
         used.add(c);
       });
    
    // Pack non-pinned nodes, avoiding reserved columns
    ids.filter(id => !pinned.has(id))
       .sort((a, b) => (rank.get(a)! - rank.get(b)!))
       .forEach(id => {
         let c = rank.get(id)!;
         while (used.has(c) || reserved.has(c)) {
           c++;
         }
         used.add(c);
         rank.set(id, c);
       });

    return rank;
  }

  const layout: Record<string, { x: number; y: number; col: number; lane: number }> = {};
  
  console.log('[Layout] Computing final positions with colW =', colW);
  
  for (let lane = 1; lane <= 4; lane++) {
    const laneBlocks = (byLane.get(lane) ?? []).slice();
    if (!laneBlocks.length) continue;
    
    const r = rankLane(laneBlocks, lane);
    console.log(`[Layout] Lane ${lane} final rankings:`, 
      Array.from(r.entries()).map(([id, col]) => {
        const block = byId.get(id);
        return `${block?.slug}(${block?.track_id || 'shared'})->col${col}`;
      }).join(', ')
    );
    
    laneBlocks.forEach(b => {
      const c = r.get(String(b.id)) ?? 0;
      const x = padX + c * colW;
      const y = padY + (lane - 1) * laneH;
      
      layout[String(b.id)] = { col: c, lane, x, y };
      
      console.log(`[Layout] ${b.slug || b.id}(${b.track_id || 'shared'}) -> lane=${lane}, col=${c}, x=${x}, y=${y}`);
    });
  }
  
  console.log('[Layout] Final node count:', Object.keys(layout).length);
  return layout;
}

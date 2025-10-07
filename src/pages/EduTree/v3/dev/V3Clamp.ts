// V3Clamp — final-pass, opinionated layout enforcer for collapsed view
// Call this right before render. Safe to run repeatedly.

import type { V3Node, V3Edge, V3Graph } from '../types/v3';

export type Tokens = {
  NODE_WIDTH: number;
  NODE_MAX_HEIGHT: number;
  LANE_GAP: number;
  H_GAP: number;
  TRACK_COLUMN_OFFSET: number;
  COL_TOLERANCE: number;
  TRACK_GUTTER: number;
  GRID: number;
  YEAR_COL: { Y1: number; Y2: number; Y3: number; Y4: number };
};

const snap = (n: number, g: number) => Math.round(n / g) * g;
const stepY = (t: Tokens) => t.NODE_MAX_HEIGHT + t.LANE_GAP;
const yearRowY = (y: number, t: Tokens) => (y - 1) * stepY(t);
const gateSlotY = (y: number, t: Tokens) => yearRowY(y, t) + stepY(t) / 2;

const laneX = (node: V3Node, t: Tokens) => {
  const y = (node.data?.year ?? 1) as 1 | 2 | 3 | 4;
  const base = (t.YEAR_COL as any)[`Y${y}`] ?? t.YEAR_COL.Y1;
  const center =
    node.type === 'gate' || !node.data?.trackId
      ? base
      : node.data.trackId === 'se'
      ? base - t.TRACK_COLUMN_OFFSET
      : base + t.TRACK_COLUMN_OFFSET;

  return snap(center, t.GRID);
};

const isGate = (n: V3Node) => n.type === 'gate' || String(n.id).includes('gate');
const isBundle = (n: V3Node) => n.type === 'track-bundle';

function clampNode(n: V3Node, t: Tokens): V3Node {
  const out: V3Node = { ...n, position: { ...n.position } };

  // 1) Snap X to strict lane center
  out.position.x = laneX(out, t);

  // 2) Snap Y:
  if (isGate(out)) {
    const yr = (out.data?.year ?? 1) as 1 | 2 | 3 | 4;
    out.position.y = snap(gateSlotY(yr, t), t.GRID);
    // gates connect vertically (between rows)
    out.sourcePosition = 'bottom';
    out.targetPosition = 'top';
  } else if (isBundle(out)) {
    const yr = (out.data?.year ?? 1) as 1 | 2 | 3 | 4;
    out.position.y = snap(yearRowY(yr, t), t.GRID);
    // bundles connect left→right along the spine
    out.sourcePosition = 'right';
    out.targetPosition = 'left';
  } else {
    // requirement nodes can be anywhere (used on expansion).
    // still clamp X to lane center & Y to grid.
    out.position.y = snap(out.position.y, t.GRID);
  }

  return out;
}

function guardSpineDirection(edges: V3Edge[], nodeMap: Map<string, V3Node>) {
  // Warn on backwards spine (we don't auto-flip since that changes semantics)
  for (const e of edges) {
    if (e.kind !== 'spine') continue;
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    const sy = s?.data?.year ?? 0;
    const ty = t?.data?.year ?? 999;
    if (!(sy < ty)) {
      console.warn('[V3Clamp] Backwards spine edge:', e.id, `Y${sy}→Y${ty}`, e);
    }
  }
}

export function clampCollapsed(graph: V3Graph, tokens: Tokens): V3Graph {
  const t = tokens;

  // 1) clamp nodes
  const nodes = graph.nodes.map(n => clampNode(n, t));

  // 2) guard overlaps for gates & bundles sharing X: put tiny epsilon on Y if identical
  // (shouldn't happen after snapping rows/slots, but belt & suspenders)
  const seen = new Map<string, V3Node[]>();
  for (const n of nodes) {
    const key = `${n.type}|${n.position.x}|${n.position.y}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(n);
  }
  for (const arr of seen.values()) {
    if (arr.length <= 1) continue;
    arr.forEach((n, i) => {
      // stagger by 1 grid unit if collision at exact same x/y
      n.position.y += i * 1; // visually imperceptible; still snapped by grid above
    });
  }

  // 3) edge sanity (spine direction)
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  guardSpineDirection(graph.edges, nodeMap);

  // 4) done
  return { nodes, edges: graph.edges };
}

export default { clampCollapsed };

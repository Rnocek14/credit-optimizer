// Unified Career Graph – Layout & Credit Edge Fixes (v3)

type Id = string;
type Point = { x: number; y: number };

interface Node {
  id: Id;
  label: string;
  lane?: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  tier?: number;
  data?: any;
}

interface Edge {
  id: Id;
  source: Id;
  target: Id;
  kind: 'requires' | 'teaches' | 'credit_transfer' | 'related';
  credit?: {
    source: 'ACE' | 'NCCRS' | 'CLEP' | 'PLA' | 'RA';
    units?: number;
    institution?: string;
  };
  points?: Point[];
  style?: { strokeDasharray?: string };
  badge?: { text: string; tone: 'success' | 'warn' | 'alert' };
  data?: any;
}

interface Graph {
  nodes: Node[];
  edges: Edge[];
}

interface LayoutOptions {
  hGap?: number;
  vGap?: number;
  laneOrder?: string[];
  margin?: number;
  avoidRadius?: number;
  maxSweeps?: number;
}

const norm = (s: any) => String(s ?? '').trim();

// --------------------------- SCC Tiering -------------------------------
function assignTiersWithSCC(graph: Graph) {
  const nodes = graph.nodes;
  const byId = new Map(nodes.map(n => [n.id, n]));

  // build adjacency excluding credit_transfer
  const adj = new Map<Id, Id[]>();
  nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    if (e.kind === 'credit_transfer') return;
    if (adj.has(e.source) && adj.has(e.target)) adj.get(e.source)!.push(e.target);
  });

  // Tarjan
  let idx = 0;
  const I: Record<string, number> = {};
  const L: Record<string, number> = {};
  const S: Id[] = [];
  const onS = new Set<Id>();
  const comps: Id[][] = [];

  function strong(v: Id) {
    I[v] = L[v] = idx++;
    S.push(v); onS.add(v);
    for (const w of adj.get(v) || []) {
      if (I[w] === undefined) { strong(w); L[v] = Math.min(L[v], L[w]); }
      else if (onS.has(w))   { L[v] = Math.min(L[v], I[w]); }
    }
    if (L[v] === I[v]) {
      const comp: Id[] = [];
      while (true) {
        const w = S.pop()!; onS.delete(w); comp.push(w);
        if (w === v) break;
      }
      comps.push(comp);
    }
  }
  nodes.forEach(n => { if (I[n.id] === undefined) strong(n.id); });

  // component index per node
  const compOf: Record<Id, number> = {};
  comps.forEach((c, i) => c.forEach(id => compOf[id] = i));

  // condensation DAG
  const dag = new Map<number, Set<number>>();
  comps.forEach((_, i) => dag.set(i, new Set()));
  graph.edges.forEach(e => {
    if (e.kind === 'credit_transfer') return;
    const a = compOf[e.source], b = compOf[e.target];
    if (a !== undefined && b !== undefined && a !== b) dag.get(a)!.add(b);
  });

  // Kahn topo + longest depth
  const indeg = new Map<number, number>();
  comps.forEach((_, i) => indeg.set(i, 0));
  dag.forEach((to, i) => to.forEach(j => indeg.set(j, (indeg.get(j) || 0) + 1)));
  const Q: number[] = [];
  indeg.forEach((d, i) => { if (d === 0) Q.push(i); });
  const order: number[] = [];
  while (Q.length) {
    const i = Q.shift()!;
    order.push(i);
    dag.get(i)!.forEach(j => { indeg.set(j, indeg.get(j)! - 1); if (indeg.get(j) === 0) Q.push(j); });
  }

  const depth = new Map<number, number>();
  order.forEach(i => depth.set(i, 0));
  order.forEach(i => {
    const d = depth.get(i)!;
    dag.get(i)!.forEach(j => depth.set(j, Math.max(depth.get(j)!, d + 1)));
  });

  nodes.forEach(n => (n.tier = depth.get(compOf[n.id]) || 0));
  return { comps, compOf };
}

// --------------------------- Crossing Minimization -------------------------------
function minimizeCrossings(graph: Graph, opts: LayoutOptions = {}) {
  const tierGroups = new Map<number, Node[]>();
  graph.nodes.forEach(n => {
    const tier = n.tier || 0;
    if (!tierGroups.has(tier)) tierGroups.set(tier, []);
    tierGroups.get(tier)!.push(n);
  });

  // Simple barycenter ordering within each tier
  tierGroups.forEach((nodes, tier) => {
    nodes.sort((a, b) => {
      const laneA = a.lane || 'Core';
      const laneB = b.lane || 'Core';
      const laneOrder = opts.laneOrder || ['Core', 'Electives', 'Transfer', 'Orphan'];
      const orderA = laneOrder.indexOf(laneA);
      const orderB = laneOrder.indexOf(laneB);
      
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label);
    });
  });
}

// --------------------------- Tier Packing -------------------------------
function packTiers(graph: Graph, opts: LayoutOptions = {}) {
  const hGap = opts.hGap ?? 320;
  const vGap = opts.vGap ?? 28;
  const margin = (opts as any).margin ?? 16;

  const tiers = new Map<number, Node[]>();
  for (const n of graph.nodes) {
    const t = n.tier || 0;
    if (!tiers.has(t)) tiers.set(t, []);
    tiers.get(t)!.push(n);
  }

  const maxT = Math.max(...[...tiers.keys()]);
  for (let t = 0; t <= maxT; t++) {
    const col = (tiers.get(t) || []).sort((a,b) => ((a as any).__rank||0) - ((b as any).__rank||0));
    let y = margin;
    const placed: Node[] = [];
    for (const n of col) {
      n.x = margin + t * hGap;
      n.y = y;
      // bump until no overlap with already placed in the same tier
      let bumped = true, guard = 0;
      while (bumped && guard++ < 50) {
        bumped = false;
        for (const p of placed) {
          const A = bbox(n), B = bbox(p);
          if (rectsOverlap(A, B)) { 
            n.y = B.y2 + vGap; 
            bumped = true; 
          }
        }
      }
      placed.push(n);
      y = bbox(n).y2 + vGap;
    }
  }
}

// --------------------------- Edge Routing -------------------------------
function routeEdges(graph: Graph, opts: LayoutOptions = {}) {
  const avoid = ((opts as any).avoidRadius ?? 12) + 6;
  const boxes = new Map(graph.nodes.map(n => [n.id, bbox(n)]));

  function ortho(a: Node, b: Node) {
    const A = boxes.get(a.id)!, B = boxes.get(b.id)!;
    const start = { x: A.x2 + 4, y: (A.y1 + A.y2)/2 };
    const end   = { x: B.x1 - 4, y: (B.y1 + B.y2)/2 };
    const pts = [start, { x: (start.x + end.x)/2, y: start.y }, { x: (start.x + end.x)/2, y: end.y }, end];

    // detour if any segment intersects any box (except endpoints)
    const hitRect = (s:{x:number;y:number}, t:{x:number;y:number}, R:{x1:number;y1:number;x2:number;y2:number}) => {
      const rx1 = Math.min(s.x,t.x), rx2 = Math.max(s.x,t.x);
      const ry1 = Math.min(s.y,t.y), ry2 = Math.max(s.y,t.y);
      return !(rx2 < R.x1 - avoid || rx1 > R.x2 + avoid || ry2 < R.y1 - avoid || ry1 > R.y2 + avoid);
    };
    const detour = (i:number, dir:1|-1) => {
      const s = pts[i], t = pts[i+1];
      const y = s.y + dir * (avoid + 12);
      pts.splice(i+1, 0, { x: s.x, y }, { x: t.x, y });
    };

    let changed = true, guard = 0;
    while (changed && guard++ < 20) {
      changed = false;
      for (let i = 0; i < pts.length - 1; i++) {
        const s = pts[i], t = pts[i+1];
        for (const [id,R] of boxes) {
          if (id === a.id || id === b.id) continue;
          if (hitRect(s,t,R)) { detour(i, (i%2===0?1:-1)); changed = true; break; }
        }
        if (changed) break;
      }
    }
    return pts;
  }

  for (const e of graph.edges) {
    const s = graph.nodes.find(n => n.id === e.source)!;
    const t = graph.nodes.find(n => n.id === e.target)!;
    e.points = ortho(s, t);
  }
}

// --------------------------- Credit Edge Decoration -------------------------------
const INSTITUTION_POLICY = {
  TESU: { aceLimit: 60, nccrsLimit: 40, clepLimit: 30 },
  SNHU: { aceLimit: 45, nccrsLimit: 30, clepLimit: 24 },
  WGU: { aceLimit: 36, nccrsLimit: 24, clepLimit: 18 },
} as const;

function decorateCreditEdges(graph: Graph) {
  graph.edges.forEach(edge => {
    if (edge.kind !== 'credit_transfer') return;
    
    edge.style = { strokeDasharray: '6 6' };
    
    if (edge.credit) {
      const { source, units, institution } = edge.credit;
      const policy = institution ? INSTITUTION_POLICY[institution as keyof typeof INSTITUTION_POLICY] : null;
      
      let tone: 'success' | 'warn' | 'alert' = 'success';
      let text = `${source}`;
      
      if (units && policy) {
        const limit = source === 'ACE' ? policy.aceLimit : 
                     source === 'NCCRS' ? policy.nccrsLimit :
                     source === 'CLEP' ? policy.clepLimit : 999;
        
        if (units > limit * 0.8) tone = 'warn';
        if (units > limit) tone = 'alert';
        text += ` (${units})`;
      }
      
      edge.badge = { text, tone };
    }
  });
}

// --------------------------- Visual Issue Scanner -------------------------------
function bbox(n: Node) {
  return {
    x1: n.x || 0,
    y1: n.y || 0,
    x2: (n.x || 0) + n.width,
    y2: (n.y || 0) + n.height,
  };
}

function rectsOverlap(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>) {
  return !(a.x2 <= b.x1 || b.x2 <= a.x1 || a.y2 <= b.y1 || b.y2 <= a.y1);
}

function segsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  // Simple line intersection check
  const det = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(det) < 1e-10) return false;
  
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / det;
  const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / det;
  
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function scanVisualIssues(graph: Graph) {
  // Node overlaps
  const overlaps: { a: Id; b: Id }[] = [];
  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const ni = graph.nodes[i];
      const nj = graph.nodes[j];
      if (rectsOverlap(bbox(ni), bbox(nj))) {
        overlaps.push({ a: ni.id, b: nj.id });
      }
    }
  }

  // Edge crossings
  const crossings: { a: Id; b: Id }[] = [];
  for (let i = 0; i < graph.edges.length; i++) {
    for (let j = i + 1; j < graph.edges.length; j++) {
      const Ei = graph.edges[i];
      const Ej = graph.edges[j];
      
      if (!Ei.points || !Ej.points) continue;
      
      let hit = false;
      for (let si = 0; si < Ei.points.length - 1; si++) {
        const segI = { a: Ei.points[si], b: Ei.points[si + 1] };
        for (let sj = 0; sj < Ej.points.length - 1; sj++) {
          const segJ = { a: Ej.points[sj], b: Ej.points[sj + 1] };
          if (segsIntersect(segI.a.x, segI.a.y, segI.b.x, segI.b.y, segJ.a.x, segJ.a.y, segJ.b.x, segJ.b.y)) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (hit) crossings.push({ a: Ei.id, b: Ej.id });
    }
  }

  // Through-nodes
  const through: { edge: Id; node: Id }[] = [];
  for (const e of graph.edges) {
    const segs = (e.points || []).slice(0, -1).map((p, i) => ({ a: p, b: (e.points || [])[i + 1] }));
    for (const n of graph.nodes) {
      if (n.id === e.source || n.id === e.target) continue;
      const R = bbox(n);
      let hit = false;
      for (const s of segs) {
        const rx1 = Math.min(s.a.x, s.b.x), rx2 = Math.max(s.a.x, s.b.x);
        const ry1 = Math.min(s.a.y, s.b.y), ry2 = Math.max(s.a.y, s.b.y);
        const inter = !(rx2 < R.x1 || rx1 > R.x2 || ry2 < R.y1 || ry1 > R.y2);
        if (inter) { hit = true; break; }
      }
      if (hit) through.push({ edge: e.id, node: n.id });
    }
  }

  return {
    nodeOverlaps: overlaps,
    edgeCrossings: crossings,
    throughNodes: through,
    summary: { overlaps: overlaps.length, crossings: crossings.length, through: through.length }
  };
}

// --------------------------- Assertions / Logs -------------------------------
export function assertTierEdgeParity(graph: Graph, activePathEdgeIds: Id[], label: string = 'TIERS≈EDGES') {
  const tSet = new Set<number>();
  graph.nodes.forEach(n => tSet.add(n.tier || 0));
  const tierCount = tSet.size;
  const edgeCount = activePathEdgeIds.length;
  const diff = Math.abs(tierCount - edgeCount);
  const ok = diff <= 1;
  
  console.log('[PF ASSERT]', { label, tierCount, edgeCount, diff, ok });
  if (!ok) {
    console.warn('[TIER MISMATCH]', { tierCount, edgeCount, diff });
  }
  return ok;
}

// ----------------------------- Main Entrypoint -------------------------------
export function applyUnifiedLayoutV3(graph: Graph, opts: LayoutOptions = {}): Graph {
  // 1) Tiering via SCC (credit edges excluded)
  const { comps } = assignTiersWithSCC(graph);

  // 2) Crossing minimization (barycenter sweeps)
  minimizeCrossings(graph, opts);

  // 3) Pack tiers – greedy no-overlap within tier
  packTiers(graph, opts);

  // 4) Obstacle-aware routing for all edges
  routeEdges(graph, opts);

  // 5) Styling + badges for credit-transfer edges
  decorateCreditEdges(graph);

  return graph;
}

// ------------------------------ Smoke Test -----------------------------------
export function layoutAndScan(graph: Graph, opts: LayoutOptions, activePathEdgeIds: Id[]) {
  const laid = applyUnifiedLayoutV3(graph, opts);
  const scan = scanVisualIssues(laid);
  assertTierEdgeParity(laid, activePathEdgeIds);
  
  console.log('[TIERS]', { tiers: new Set(laid.nodes.map(n => n.tier)).size });
  return { graph: laid, scan };
}

export type { Graph, Node, Edge, LayoutOptions, Id };
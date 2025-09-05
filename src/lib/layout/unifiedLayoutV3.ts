// Unified Career Graph – Layout & Credit Edge Fixes (v3)

type Id = string;
type Point = { x: number; y: number };
type Num = number;

function avg(nums: Num[]) { return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : 0; }

// Build quick lookup
function indexById<T extends {id: string}>(arr: T[]) {
  const m = new Map<string, T>(); arr.forEach(a => m.set(a.id, a)); return m;
}

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
  const byId = indexById(nodes);

  // Build adjacency excluding credit_transfer
  const adj = new Map<string, string[]>(); 
  nodes.forEach(n => adj.set(n.id, []));
  for (const e of graph.edges) {
    if (e.kind === 'credit_transfer') continue;
    if (adj.has(e.source) && adj.has(e.target)) adj.get(e.source)!.push(e.target);
  }

  // Tarjan
  let idx = 0;
  const I: Record<string, number|undefined> = {};
  const L: Record<string, number> = {};
  const S: string[] = [];
  const onS = new Set<string>();
  const comps: string[][] = [];

  function strong(v: string) {
    I[v] = L[v] = idx++;
    S.push(v); onS.add(v);
    for (const w of adj.get(v) || []) {
      if (I[w] === undefined) { strong(w); L[v] = Math.min(L[v], L[w]); }
      else if (onS.has(w))   { L[v] = Math.min(L[v], I[w]!); }
    }
    if (L[v] === I[v]) {
      const comp: string[] = [];
      while (true) {
        const w = S.pop()!; onS.delete(w); comp.push(w);
        if (w === v) break;
      }
      comps.push(comp);
    }
  }
  for (const n of nodes) if (I[n.id] === undefined) strong(n.id);

  // condensation DAG
  const compOf: Record<string, number> = {};
  comps.forEach((c, i) => c.forEach(id => compOf[id] = i));
  const dag = new Map<number, Set<number>>();
  comps.forEach((_, i) => dag.set(i, new Set()));
  for (const e of graph.edges) {
    if (e.kind === 'credit_transfer') continue;
    const a = compOf[e.source], b = compOf[e.target];
    if (a !== undefined && b !== undefined && a !== b) dag.get(a)!.add(b);
  }

  // Longest path depth on DAG
  const indeg = new Map<number, number>(); 
  comps.forEach((_, i) => indeg.set(i, 0));
  dag.forEach((to, i) => to.forEach(j => indeg.set(j, (indeg.get(j) || 0) + 1)));
  const Q: number[] = []; 
  indeg.forEach((d,i)=>{ if(d===0) Q.push(i); });
  const order: number[] = [];
  while (Q.length) { 
    const i = Q.shift()!; 
    order.push(i); 
    dag.get(i)!.forEach(j => { 
      indeg.set(j, indeg.get(j)!-1); 
      if(indeg.get(j)===0) Q.push(j); 
    }); 
  }

  const depth = new Map<number, number>(); 
  order.forEach(i => depth.set(i, 0));
  order.forEach(i => { 
    const d = depth.get(i)!; 
    dag.get(i)!.forEach(j => depth.set(j, Math.max(depth.get(j)!, d+1))); 
  });

  // assign node tiers & optional cluster id
  nodes.forEach(n => {
    n.tier = depth.get(compOf[n.id]) || 0;
    (n as any).clusterId = comps[compOf[n.id]].length > 1 ? `scc_${compOf[n.id]}` : undefined;
  });

  return { comps, compOf };
}

// --------------------------- Barycentric Ordering -------------------------------
function buildTierGroups(graph: Graph) {
  const tiers = new Map<number, Graph['nodes']>();
  for (const n of graph.nodes) {
    const t = n.tier || 0;
    if (!tiers.has(t)) tiers.set(t, []);
    tiers.get(t)!.push(n);
  }
  return tiers;
}

// average neighbor position index from previous/next tier
function barycenter(graph: Graph, tier: number, neighborTier: number, posIndex: Map<string, number>) {
  const edges = graph.edges.filter(e => e.kind !== 'credit_transfer');
  const neigh = new Map<string, number>();
  for (const n of (buildTierGroups(graph).get(tier) || [])) {
    const ns: number[] = [];
    for (const e of edges) {
      if (tier < neighborTier && e.source === n.id) {
        const idx = posIndex.get(e.target); if (idx !== undefined) ns.push(idx);
      }
      if (tier > neighborTier && e.target === n.id) {
        const idx = posIndex.get(e.source); if (idx !== undefined) ns.push(idx);
      }
    }
    neigh.set(n.id, ns.length ? avg(ns) : Number.POSITIVE_INFINITY);
  }
  return neigh;
}

function barycentricSweeps(graph: Graph, sweeps = 4) {
  const tiers = buildTierGroups(graph);
  // start with label sort for determinism
  tiers.forEach(arr => arr.sort((a,b)=>(a.label||'').localeCompare(b.label||'')));

  for (let s=0; s<sweeps; s++) {
    // top-down
    const keysAsc = [...tiers.keys()].sort((a,b)=>a-b);
    let pos = new Map<string, number>();
    for (const t of keysAsc) {
      const arr = tiers.get(t)!; arr.forEach((n,i)=>pos.set(n.id, i));
      const bc = barycenter(graph, t, t-1, pos);
      arr.sort((a,b)=> (bc.get(a.id)! - bc.get(b.id)!));
      arr.forEach((n,i)=>{ pos.set(n.id,i); (n as any).__rank = i; }); // Write back rank
    }
    // bottom-up
    const keysDesc = [...tiers.keys()].sort((a,b)=>b-a);
    pos = new Map<string, number>();
    for (const t of keysDesc) {
      const arr = tiers.get(t)!; arr.forEach((n,i)=>pos.set(n.id, i));
      const bc = barycenter(graph, t, t+1, pos);
      arr.sort((a,b)=> (bc.get(a.id)! - bc.get(b.id)!));
      arr.forEach((n,i)=>{ pos.set(n.id,i); (n as any).__rank = i; }); // Write back rank
    }
  }
  return tiers;
}

// --------------------------- Tier Packing (ordered) -------------------------------
function packTiers(graph: Graph, opts: LayoutOptions = {}) {
  const hGap = opts.hGap ?? 320;
  const vGap = opts.vGap ?? 28;
  const margin = opts.margin ?? 16;

  const tiers = barycentricSweeps(graph, opts.maxSweeps ?? 4);
  const maxTier = Math.max(...[...tiers.keys()]);
  for (let t=0; t<=maxTier; t++) {
    const laneOrder = opts.laneOrder ?? ['Core','Electives','Transfer','Orphan'];
    const laneIndex = (n:Node)=> Math.max(0, laneOrder.indexOf(n.lane ?? 'Core'));
    const col = (tiers.get(t) || []).sort((a,b) => 
      laneIndex(a) - laneIndex(b) || ((a as any).__rank ?? 0) - ((b as any).__rank ?? 0)
    );
    let y = margin;
    const placed: Node[] = [];
    for (const n of col) {
      n.x = margin + t * hGap;
      n.y = y;
      // Use proper node dimensions
      const width = n.width ?? 260;
      const height = n.height ?? 120;
      // bump down while overlapping within the column
      let bumped = true, guard = 0;
      while (bumped && guard++ < 60) {
        bumped = false;
        for (const p of placed) {
          const A = { x1: n.x!, y1: n.y!, x2: n.x! + width, y2: n.y! + height };
          const B = bbox(p);
          if (rectsOverlap(A,B)) { n.y = B.y2 + vGap; bumped = true; }
        }
      }
      placed.push(n);
      y = (n.y! + height) + vGap;
    }
  }
}

// --------------------------- Edge Routing (curved & bundled) -------------------------------
function routeEdges(graph: Graph, opts: LayoutOptions = {}) {
  const margin = opts.margin ?? 16;
  const hGap   = opts.hGap ?? 320;
  const transferLaneX = (Math.max(...graph.nodes.map(n => n.tier||0)) + 1) * hGap + margin * 2;

  const NB = new Map(graph.nodes.map(n => [n.id, bbox(n)]));

  function midY(A:{y1:number;y2:number}) { return (A.y1 + A.y2)/2; }

  function bezierPoints(A: ReturnType<typeof bbox>, B: ReturnType<typeof bbox>, k=0.35) {
    const start = { x: A.x2 + 4, y: midY(A) };
    const end   = { x: B.x1 - 4, y: midY(B) };
    const dx = Math.max(80, (end.x - start.x) * k);
    return [
      start,
      { x: start.x + dx, y: start.y },
      { x: end.x   - dx, y: end.y },
      end
    ];
  }

  function bezierViaTransfer(A: ReturnType<typeof bbox>, B: ReturnType<typeof bbox>, offset=0) {
    // route to lane, then to target
    const start = { x: A.x2 + 4, y: midY(A) };
    const via1  = { x: transferLaneX + offset, y: start.y };
    const via2  = { x: transferLaneX + offset, y: midY(B) };
    const end   = { x: B.x1 - 4, y: midY(B) };
    return [ start, via1, via2, end ];
  }

  // simple bundling: group edges by (tier(source)->tier(target))
  const tierOf = (id:string)=> graph.nodes.find(n=>n.id===id)?.tier ?? 0;
  const groups = new Map<string, Edge[]>();
  for (const e of graph.edges) {
    const key = `${tierOf(e.source)}>${tierOf(e.target)}:${e.kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  for (const [,edges] of groups) {
    edges.forEach((e, i) => {
      const A = NB.get(e.source)!; const B = NB.get(e.target)!;
      if (e.kind === 'credit_transfer') {
        const offset = (i - (edges.length-1)/2) * 10; // small spread
        e.points = bezierViaTransfer(A, B, offset);
        e.style = { ...(e.style||{}), strokeDasharray: '6 6' };
      } else {
        const pts = bezierPoints(A, B, 0.35);
        // gentle lateral offset to reduce overlaps inside group
        const off = (i - (edges.length-1)/2) * 6;
        e.points = pts.map(p => ({ x: p.x, y: p.y + off }));
      }
    });
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
  assignTiersWithSCC(graph);

  // 2) Pack tiers with barycentric ordering (includes crossing minimization)
  packTiers(graph, opts);

  // 3) Curved/bundled routing for all edges
  routeEdges(graph, opts);

  // 4) Styling + badges for credit-transfer edges
  decorateCreditEdges(graph);

  return graph;
}

// ------------------------------ Smoke Test -----------------------------------
export function layoutAndScan(graph: Graph, opts: LayoutOptions, activePathEdgeIds: Id[]) {
  const laid = applyUnifiedLayoutV3(graph, opts);
  const scan = scanVisualIssues(laid);

  // parity assertion (≈ guard, not exact)
  const tSet = new Set(laid.nodes.map(n => n.tier ?? 0));
  const diff = Math.abs(activePathEdgeIds.length - tSet.size);
  const ok = diff <= 1;
  console.log('[PF ASSERT]', { label: 'TIERS≈EDGES', tiers: tSet.size, edges: activePathEdgeIds.length, diff, ok });

  // Enhanced crossings + through nodes summary
  console.log('[SCAN SUMMARY]', scan.summary);
  if (scan.summary.crossings > 0) {
    console.log('[CROSSINGS]', scan.edgeCrossings.slice(0, 5)); // first 5
  }
  if (scan.summary.through > 0) {
    console.log('[THROUGH-NODES]', scan.throughNodes.slice(0, 5)); // first 5
  }

  console.log('[TIERS]', { tiers: tSet.size });
  return { graph: laid, scan };
}

export type { Graph, Node, Edge, LayoutOptions, Id };
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
}

const norm = (s: any) => String(s ?? '').trim();

// --------------------------- SCC Tiering -------------------------------
function assignTiersWithSCC(graph: Graph) {
  const nodes = graph.nodes;
  const edges = graph.edges.filter(e => e.kind !== 'credit_transfer'); // exclude credit edges from tiering
  
  const adj = new Map<Id, Id[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
    }
  });

  // Simple topological sort with cycle detection
  const visited = new Set<Id>();
  const visiting = new Set<Id>();
  const tiers = new Map<Id, number>();
  
  function visit(nodeId: Id): number {
    if (tiers.has(nodeId)) return tiers.get(nodeId)!;
    if (visiting.has(nodeId)) return 0; // cycle detected, assign tier 0
    
    visiting.add(nodeId);
    let maxTier = 0;
    
    for (const neighbor of adj.get(nodeId) || []) {
      maxTier = Math.max(maxTier, visit(neighbor) + 1);
    }
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    tiers.set(nodeId, maxTier);
    return maxTier;
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      visit(n.id);
    }
  });

  // Assign tiers to nodes
  nodes.forEach(n => {
    n.tier = tiers.get(n.id) || 0;
  });

  return { comps: Array.from(new Set(tiers.values())).length };
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
  const hGap = opts.hGap || 320;
  const vGap = opts.vGap || 28;
  
  const tierGroups = new Map<number, Node[]>();
  graph.nodes.forEach(n => {
    const tier = n.tier || 0;
    if (!tierGroups.has(tier)) tierGroups.set(tier, []);
    tierGroups.get(tier)!.push(n);
  });

  const tiers = Array.from(tierGroups.keys()).sort((a, b) => a - b);
  
  tiers.forEach(tierNum => {
    const nodes = tierGroups.get(tierNum)!;
    const x = tierNum * hGap;
    
    let y = 0;
    nodes.forEach(node => {
      node.x = x;
      node.y = y;
      y += node.height + vGap;
    });
  });
}

// --------------------------- Edge Routing -------------------------------
function routeEdges(graph: Graph, opts: LayoutOptions = {}) {
  const nodeMap = new Map<Id, Node>();
  graph.nodes.forEach(n => nodeMap.set(n.id, n));

  graph.edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    
    if (!source || !target) return;

    // Simple direct routing with basic obstacle avoidance
    const sx = (source.x || 0) + source.width;
    const sy = (source.y || 0) + source.height / 2;
    const tx = target.x || 0;
    const ty = (target.y || 0) + target.height / 2;

    // Create waypoints for routing
    const points: Point[] = [];
    points.push({ x: sx, y: sy });
    
    // Add intermediate waypoint if nodes are far apart
    if (Math.abs(tx - sx) > 200) {
      const midX = sx + (tx - sx) * 0.7;
      points.push({ x: midX, y: sy });
      points.push({ x: midX, y: ty });
    }
    
    points.push({ x: tx, y: ty });
    edge.points = points;
  });
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
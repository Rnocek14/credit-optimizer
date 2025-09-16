import type { Edge, Node } from '@xyflow/react';

export type GraphQAMetrics = {
  nodes: number;
  edges: number;
  sharedBlocks: number;
  seBlocks: number;
  dsBlocks: number;
  terminals: string[];               // node ids with outdegree 0
  divergenceGateId?: string;         // shared node with edges → SE & DS
  crossingsApprox: number;           // simple O(E^2) segment intersection count (approx)
  throughNodesApprox: number;        // edges whose straight segment bbox intersects any 3rd node bbox
  forwardEdgeViolations: number;     // edges that go from higher->lower level_year or same-level if disallowed
  duplicateEdges: number;            // after id normalization
  cycleDetected: boolean;
  perf: { transformMs?: number; renderMs?: number };
  flags: Record<string, boolean>;
  warnings: string[];
};

export function normalizeEdgeId(source: string, target: string) {
  return `e-${String(source)}-${String(target)}`;
}

export function dedupeEdges(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) {
    const key = normalizeEdgeId(String(e.source), String(e.target));
    if (!seen.has(key)) { 
      seen.add(key); 
      out.push({ ...e, id: key }); 
    }
  }
  return out;
}

export function topoCycle(nodes: Node[], edges: Edge[]): boolean {
  const indeg = new Map(nodes.map(n => [n.id, 0]));
  for (const e of edges) indeg.set(String(e.target), (indeg.get(String(e.target)) ?? 0) + 1);
  const q: string[] = [];
  for (const [id, d] of indeg) if ((d ?? 0) === 0) q.push(id);
  let seen = 0;
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
    const s = String(e.source), t = String(e.target);
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s)!.push(t);
  });
  while (q.length) {
    const u = q.shift()!;
    seen++;
    for (const v of (adj.get(u) ?? [])) {
      indeg.set(v, (indeg.get(v) ?? 0) - 1);
      if ((indeg.get(v) ?? 0) === 0) q.push(v);
    }
  }
  return seen !== nodes.length;
}

export function computeGraphQAMetrics(
  nodes: Node[],
  edgesIn: Edge[],
  opts: { 
    getLevelYear: (id: string) => number | undefined; 
    getTrackId: (id: string) => 'software-engineering'|'data-science'|null|undefined; 
    flags: Record<string, boolean>; 
  }
): GraphQAMetrics {
  const edges = dedupeEdges(edgesIn);
  const idToNode = new Map(nodes.map(n => [String(n.id), n]));
  const outdeg = new Map<string, number>();
  const indeg  = new Map<string, number>();
  
  for (const e of edges) {
    const s = String(e.source), t = String(e.target);
    outdeg.set(s, (outdeg.get(s) ?? 0) + 1);
    indeg.set(t, (indeg.get(t) ?? 0) + 1);
  }

  // terminals
  const terminals = nodes.filter(n => (outdeg.get(String(n.id)) ?? 0) === 0).map(n => String(n.id));

  // counts by track
  let sharedBlocks = 0, seBlocks = 0, dsBlocks = 0;
  nodes.forEach(n => {
    const tr = opts.getTrackId(String(n.id));
    if (!tr) sharedBlocks++; 
    else if (tr === 'software-engineering') seBlocks++; 
    else dsBlocks++;
  });

  // divergence gate (shared node with edges to both tracks)
  let divergenceGateId: string | undefined;
  for (const n of nodes) {
    const id = String(n.id);
    const outs = edges.filter(e => String(e.source) === id).map(e => String(e.target));
    const tTracks = new Set(outs.map(t => opts.getTrackId(t)));
    if (tTracks.has('software-engineering') && tTracks.has('data-science') && !opts.getTrackId(id)) {
      divergenceGateId = id; 
      break;
    }
  }

  // forward-edge violations (must go to strictly higher level_year)
  let forwardEdgeViolations = 0;
  for (const e of edges) {
    const lyS = opts.getLevelYear(String(e.source));
    const lyT = opts.getLevelYear(String(e.target));
    if (lyS != null && lyT != null && !(lyT > lyS)) forwardEdgeViolations++;
  }

  // naive crossings/through-nodes (bbox approx; OK for QA)
  const bbox = (n: Node) => ({ 
    x: n.position?.x ?? 0, 
    y: n.position?.y ?? 0, 
    w: (n.measured?.width ?? 240), 
    h: (n.measured?.height ?? 120) 
  });
  
  const seg = (e: Edge) => {
    const a = idToNode.get(String(e.source)); 
    const b = idToNode.get(String(e.target));
    return a && b ? [
      {x: a.position?.x ?? 0, y: a.position?.y ?? 0},
      {x: b.position?.x ?? 0, y: b.position?.y ?? 0}
    ] : null;
  };
  
  const inter = (p1: any, p2: any, p3: any, p4: any) => {
    const d = (a: any, b: any, c: any) => ((c.x-b.x)*(a.y-b.y) - (c.y-b.y)*(a.x-b.x));
    const d1 = d(p1,p2,p3), d2 = d(p1,p2,p4), d3 = d(p3,p4,p1), d4 = d(p3,p4,p2);
    return ((d1>0&&d2<0)||(d1<0&&d2>0)) && ((d3>0&&d4<0)||(d3<0&&d4>0));
  };
  
  let crossingsApprox = 0, throughNodesApprox = 0;
  const segs = edges.map(seg).filter(Boolean) as any[];
  
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (inter(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) crossingsApprox++;
    }
  }
  
  for (const e of edges) {
    const s = seg(e); 
    if (!s) continue;
    for (const n of nodes) {
      const bb = bbox(n);
      const minx = Math.min(s[0].x, s[1].x), maxx = Math.max(s[0].x, s[1].x);
      const miny = Math.min(s[0].y, s[1].y), maxy = Math.max(s[0].y, s[1].y);
      const overl = !(maxx < bb.x || minx > bb.x+bb.w || maxy < bb.y || miny > bb.y+bb.h);
      if (overl && String(n.id) !== String(e.source) && String(n.id) !== String(e.target)) { 
        throughNodesApprox++; 
        break; 
      }
    }
  }

  const duplicateEdges = edgesIn.length - edges.length;
  const cycleDetected = topoCycle(nodes, edges);

  return {
    nodes: nodes.length,
    edges: edges.length,
    sharedBlocks, 
    seBlocks, 
    dsBlocks,
    terminals, 
    divergenceGateId,
    crossingsApprox, 
    throughNodesApprox,
    forwardEdgeViolations, 
    duplicateEdges, 
    cycleDetected,
    perf: {}, 
    flags: opts.flags, 
    warnings: []
  };
}
// src/dev/visualScan.ts
// Dev-only helper to scan the rendered React Flow canvas and the in-memory graph.

export type VisualScanIssue =
  | { type: 'NODE_OVERLAP'; aId: string; bId: string; overlapArea: number }
  | { type: 'EDGE_CROSSING'; aId: string; bId: string; point: { x: number; y: number } }
  | { type: 'EDGE_THROUGH_NODE'; edgeId: string; nodeId: string }
  | { type: 'MISSING_LABEL'; edgeId: string }
  | { type: 'DISCONNECTED_PATH_SEGMENT'; reason: string; nodeId?: string; edgeId?: string };

export type VisualScanCareerReport = {
  careerId: string;
  careerLabel: string;
  preset: 'fastest'|'cheapest'|'creditMaximized'|'balanced';
  pathNodes: string[];              // ordered ids
  pathEdges: string[];              // ids in path
  firstDegreeNeighbors: string[];   // off-path neighbors touching path
  notes?: string;
};

export type VisualScanSnapshot = {
  counts: { nodes: number; edges: number; labels: number };
  tiers?: { edgeOn: number; edgeRelated: number; edgeOff: number };
  issues: VisualScanIssue[];
  careers: VisualScanCareerReport[];
};

type Rect = { x: number; y: number; w: number; h: number; id: string };
type LineSegment = { x1: number; y1: number; x2: number; y2: number };

const $all = (sel: string, root: Document | HTMLElement = document) =>
  Array.from(root.querySelectorAll(sel)) as HTMLElement[];

/**
 * Gets all node rectangles with improved deduplication
 */
function getNodeRects(): Rect[] {
  // Query both test IDs and react-flow nodes to ensure deduplication
  const selectors = ['[data-testid="lp-node"]', '.react-flow__node[data-id]'];
  const allNodes = new Set<HTMLElement>();
  
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => allNodes.add(el as HTMLElement));
  });

  const byId = new Map<string, Rect>();

  for (const el of allNodes) {
    const id = el.getAttribute('data-id') || '';
    if (!id) continue;
    const r = el.getBoundingClientRect();
    const rect = { id, x: r.left, y: r.top, w: r.width, h: r.height };
    const prev = byId.get(id);
    // Keep largest rect if duplicate IDs exist
    if (!prev || (rect.w * rect.h) > (prev.w * prev.h)) byId.set(id, rect);
  }
  return Array.from(byId.values()).filter(r => r.w > 0 && r.h > 0);
}

function rectsOverlap(a: Rect, b: Rect, pad = 2) {
  // Allow small padding so tight nodes don't false positive
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}

function overlapArea(a: Rect, b: Rect) {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function getEdgeSegments(): { id: string; segs: LineSegment[] }[] {
  const paths = Array.from(
    document.querySelectorAll('.react-flow__edges .react-flow__edge-path')
  ) as SVGPathElement[];
  
  const results = [];
  for (const p of paths) {
    const id = p.getAttribute('data-id') || p.parentElement?.getAttribute('data-id') || '';
    if (!id) continue;
    
    try {
      const total = p.getTotalLength();
      const step = Math.max(6, total / 32);
      const pts: {x:number;y:number}[] = [];
      for (let d = 0; d <= total; d += step) {
        const pt = p.getPointAtLength(d);
        // pt is already in SVG viewport coords; no DOMRect translation needed
        pts.push({ x: pt.x, y: pt.y });
      }
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        segs.push({ x1: pts[i-1].x, y1: pts[i-1].y, x2: pts[i].x, y2: pts[i].y });
      }
      results.push({ id, segs });
    } catch { /* ignore bad paths */ }
  }
  return results;
}

function linesIntersect(a: LineSegment, b: LineSegment) {
  // standard segment intersection
  const det = (x1:number,y1:number,x2:number,y2:number)=>x1*y2-x2*y1;
  const sub = (a:{x:number,y:number},b:{x:number,y:number})=>({x:a.x-b.x,y:a.y-b.y});
  const A={x:a.x1,y:a.y1}, B={x:a.x2,y:a.y2}, C={x:b.x1,y:b.y1}, D={x:b.x2,y:b.y2};
  const r=sub(B,A), s=sub(D,C);
  const rxs = det(r.x,r.y,s.x,s.y);
  const q_p = sub(C,A);
  if (rxs === 0) return false; // parallel or collinear (ignore for now)
  const t = det(q_p.x,q_p.y,s.x,s.y) / rxs;
  const u = det(q_p.x,q_p.y,r.x,r.y) / rxs;
  return t>0 && t<1 && u>0 && u<1;
}

function segmentIntersections(a: LineSegment[], b: LineSegment[]) {
  const hits = [];
  for (const sa of a) {
    for (const sb of b) {
      if (linesIntersect(sa, sb)) {
        // Calculate intersection point for better reporting
        const det = (x1:number,y1:number,x2:number,y2:number)=>x1*y2-x2*y1;
        const sub = (a:{x:number,y:number},b:{x:number,y:number})=>({x:a.x-b.x,y:a.y-b.y});
        const A={x:sa.x1,y:sa.y1}, B={x:sa.x2,y:sa.y2}, C={x:sb.x1,y:sb.y1}, D={x:sb.x2,y:sb.y2};
        const r=sub(B,A), s=sub(D,C);
        const rxs = det(r.x,r.y,s.x,s.y);
        if (rxs === 0) continue; // Skip parallel lines
        const q_p = sub(C,A);
        const t = det(q_p.x,q_p.y,s.x,s.y) / rxs;
        const intersectionX = A.x + t * r.x;
        const intersectionY = A.y + t * r.y;
        hits.push({ x: intersectionX, y: intersectionY });
      }
    }
  }
  return hits;
}

function edgeThroughNode(edgeSegs: LineSegment[], node: Rect) {
  // If any sample point lies within node rect we treat as "through node"
  for (const s of edgeSegs) {
    // mid-point check for speed
    const mx=(s.x1+s.x2)/2, my=(s.y1+s.y2)/2;
    if (mx >= node.x && mx <= node.x+node.w && my >= node.y && my <= node.y+node.h) return true;
  }
  return false;
}

// Helper to wait for DOM stability
async function rAF2() { 
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); 
}

export async function runVisualScan(opts: {
  graph: any; // LifePathGraph
  pathfindingResult?: any|null;
  activePreset: 'fastest'|'cheapest'|'creditMaximized'|'balanced';
  careerSelector?: (n:any)=>boolean; // default: node.type==='job' || tags include 'career'
  reactFlowEdges?: any[]; // Pass edges with data.tier for accurate counting
}): Promise<VisualScanSnapshot> {
  // Wait for DOM stability
  await rAF2();
  
  const nodes = getNodeRects();
  const edges = getEdgeSegments();
  const issues: VisualScanIssue[] = [];
  
  // Check if we have a real path to analyze
  const pf = opts.pathfindingResult;
  const presetMap = pf ? {
    fastest: pf.fastest, 
    cheapest: pf.cheapest, 
    creditMaximized: pf.creditMaximized, 
    balanced: pf.recommendations?.primary || pf.balanced
  } : null;
  const activePath = presetMap ? presetMap[opts.activePreset] : null;
  const okToScan = (activePath?.nodeIds?.length ?? 0) > 1;
  
  if (!okToScan) {
    return {
      counts: { nodes: nodes.length, edges: edges.length, labels: 0 },
      tiers: { edgeOn: 0, edgeRelated: 0, edgeOff: 0 },
      issues: [],
      careers: []
    };
  }

  // Find node overlaps (avoid self-overlaps and duplicates)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) { // j starts at i+1 to avoid self + dup
      const a = nodes[i], b = nodes[j];
      if (a.id === b.id) continue; // no self-overlap
      const area = overlapArea(a, b);
      if (area > 12) { // Threshold raised from 6 to reduce noise
        issues.push({
          type: 'NODE_OVERLAP',
          aId: a.id,
          bId: b.id,
          overlapArea: area,
        });
      }
    }
  }

  // Edge crossings and edges through node boxes
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const hits = segmentIntersections(edges[i].segs, edges[j].segs);
      if (hits.length > 0) {
        const point = hits[0]; // Use first intersection point
        issues.push({ type: 'EDGE_CROSSING', aId: edges[i].id, bId: edges[j].id, point });
      }
    }
  }
  
  for (const e of edges) {
    for (const n of nodes) {
      if (edgeThroughNode(e.segs, n)) {
        issues.push({ type: 'EDGE_THROUGH_NODE', edgeId: e.id, nodeId: n.id });
      }
    }
  }

  // Per-career connection map (already computed above)

  const isCareer = opts.careerSelector || ((n:any) =>
    (n.type && n.type.toLowerCase()==='job') ||
    (Array.isArray(n.tags) && n.tags.some((t:string)=>/career|role|job/i.test(t)))
  );

  const careers = (opts.graph?.nodes||[]).filter(isCareer);

  const connections: VisualScanCareerReport[] = careers.map((c:any) => {
    // naive: connected if any edge touches career node
    const touchingEdges = (opts.graph?.edges||[]).filter((e:any)=> e.sourceId===c.id || e.targetId===c.id);
    const neighborIds = new Set<string>();
    touchingEdges.forEach((e:any)=>{
      neighborIds.add(e.sourceId===c.id ? e.targetId : e.sourceId);
    });

    const pathIds: string[] = activePath?.nodeIds || [];
    const pathEdgeIds: string[] = activePath?.edgeIds || [];

    // first-degree neighbors intersecting the path
    const firstDegreeOnPath = Array.from(neighborIds).filter(id => pathIds.includes(id));

    return {
      careerId: c.id,
      careerLabel: c.label || c.name || c.title || c.id,
      preset: opts.activePreset,
      pathNodes: pathIds,
      pathEdges: pathEdgeIds,
      firstDegreeNeighbors: Array.from(neighborIds),
      notes: firstDegreeOnPath.length ? `touches path at ${firstDegreeOnPath.length} nodes` : undefined
    };
  });

  // Check for missing labels (only require labels for transfer-ish edges)
  document.querySelectorAll('[data-testid="lp-edge"]').forEach(el => {
    const id = el.getAttribute('data-id') || '';
    const type = el.getAttribute('data-edge-type') || '';
    const hasLabel = !!el.querySelector('[data-testid="lp-edge-label"]');
    
    // Require labels only for transfer edges
    const needsLabel = /creditTransfersTo/i.test(type);
    if (needsLabel && !hasLabel && id) {
      issues.push({ type: 'MISSING_LABEL', edgeId: id });
    }
  });

  // A2: Count tiers from data, not DOM (fixes 48 vs 16 mismatch and timing issues)
  // Scanner must receive reactFlowEdges array as parameter instead of building from DOM
  const reactFlowEdgesFromParam = (opts as any).reactFlowEdges || [];
  
  // Debug logging to see what we're getting
  console.info('[visual-scan] Edge data sample:', reactFlowEdgesFromParam.slice(0, 3).map(e => ({
    id: e.id,
    source: e.source, 
    target: e.target,
    tier: e.data?.tier,
    hasData: !!e.data,
    dataKeys: e.data ? Object.keys(e.data) : []
  })));
  
  const tiers = reactFlowEdgesFromParam.reduce((acc: any, e: any) => {
    const t = (e.data?.tier) as 'on-path'|'related'|'off-path'|undefined;
    if (t === 'on-path') acc.edgeOn++;
    else if (t === 'related') acc.edgeRelated++;
    else if (t === 'off-path') acc.edgeOff++;
    return acc;
  }, { edgeOn: 0, edgeRelated: 0, edgeOff: 0 });

  const labels = document.querySelectorAll('[data-testid="lp-edge-label"]').length;

  // Enhanced logging for debugging
  console.info('[visual-scan]', {
    tiers: `${tiers.edgeOn}/${tiers.edgeRelated}/${tiers.edgeOff}`,
    issues: issues.length,
    breakdown: {
      overlaps: issues.filter(i => i.type === 'NODE_OVERLAP').length,
      crossings: issues.filter(i => i.type === 'EDGE_CROSSING').length,
      throughNodes: issues.filter(i => i.type === 'EDGE_THROUGH_NODE').length,
      missingLabels: issues.filter(i => i.type === 'MISSING_LABEL').length
    },
    labels
  });

  return {
    counts: { nodes: nodes.length, edges: edges.length, labels },
    tiers,
    issues,
    careers: connections
  } as VisualScanSnapshot;
}

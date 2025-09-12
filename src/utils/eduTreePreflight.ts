import { Node, Edge } from '@xyflow/react';

export type RFNode = Node;
export type RFEdge = Edge;

export class EduTreeDataError extends Error {
  name = 'EduTreeDataError';
  
  constructor(message: string) {
    super(message);
    this.name = 'EduTreeDataError';
  }
}

const EDGE_ID_OK = /^e-.+-.+$/;

export function normalizeEdgeId(e: RFEdge): string {
  const id = String(e.id ?? '');
  if (EDGE_ID_OK.test(id)) return id;
  if (!e.source || !e.target) return `e-INVALID-${Math.random().toString(36).slice(2)}`;
  return `e-${String(e.source)}-${String(e.target)}`;
}

export function sanitizeNodes(nodesIn: RFNode[], nodeTypes?: Record<string, any>): Node[] {
  const out: Node[] = [];
  const seen = new Set<string>();

  for (const n of nodesIn ?? []) {
    let id = String(n?.id ?? '');
    if (!id) id = `node-${Math.random().toString(36).slice(2)}`;
    if (seen.has(id)) id = `${id}__dup_${Math.random().toString(36).slice(2)}`;
    seen.add(id);

    const pos = n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y)
      ? n.position
      : { x: 0, y: 0 };

    // If nodeTypes provided, ensure type exists; otherwise strip it to default
    const type = n.type && nodeTypes && !nodeTypes[n.type] ? undefined : n.type;

    out.push({ 
      ...n, 
      id, 
      position: pos, 
      type,
      data: n.data || {}
    } as Node);
  }
  
  if (out.length === 0) {
    throw new EduTreeDataError('No nodes after sanitize - all input nodes were invalid');
  }
  
  return out;
}

export function sanitizeEdges(edgesIn: RFEdge[], nodeIds: Set<string>): Edge[] {
  const out: Edge[] = [];
  const seen = new Set<string>();
  const droppedReasons: string[] = [];

  for (const e of edgesIn ?? []) {
    const source = e?.source ? String(e.source) : '';
    const target = e?.target ? String(e.target) : '';
    
    // Drop edges with missing endpoints
    if (!source || !target) {
      droppedReasons.push(`Missing source/target: ${source || 'null'} -> ${target || 'null'}`);
      continue;
    }
    
    // Drop edges whose endpoints aren't present
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      droppedReasons.push(`Missing nodes: ${source} -> ${target}`);
      continue;
    }

    const id = normalizeEdgeId(e);
    const finalId = seen.has(id) ? `${id}__dup_${Math.random().toString(36).slice(2)}` : id;
    seen.add(finalId);

    out.push({ 
      ...e, 
      id: finalId, 
      source, 
      target,
      data: e.data || {}
    } as Edge);
  }
  
  if (process.env.NODE_ENV !== 'production' && droppedReasons.length > 0) {
    console.warn('[EduTree Preflight] Dropped edges:', droppedReasons.slice(0, 5));
  }
  
  // Allow empty edges for now - some graphs might legitimately have no connections
  return out;
}

/** Full preflight: validate raw nodes/edges and return crash-proof sets (or throw with a crisp reason). */
export function preflightGraph(rawNodes: RFNode[], rawEdges: RFEdge[], nodeTypes?: Record<string, any>): { nodes: Node[]; edges: Edge[] } {
  if (!rawNodes || !Array.isArray(rawNodes)) {
    throw new EduTreeDataError('Invalid nodes input - not an array');
  }
  
  if (!rawEdges || !Array.isArray(rawEdges)) {
    throw new EduTreeDataError('Invalid edges input - not an array');
  }

  const nodes = sanitizeNodes(rawNodes, nodeTypes);
  const nodeIds = new Set(nodes.map(n => String(n.id)));
  const edges = sanitizeEdges(rawEdges, nodeIds);

  // Final deep checks
  const badEdgeIds = edges.filter(e => !EDGE_ID_OK.test(String(e.id))).slice(0, 5);
  if (badEdgeIds.length) {
    throw new EduTreeDataError(`Non-normalized edge IDs detected: ${badEdgeIds.map(e => e.id).join(', ')}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[EduTree Preflight] Sanitized graph:', {
      nodes: nodes.length,
      edges: edges.length,
      nodeTypes: Object.keys(nodeTypes || {}),
      sampleNodeIds: [...nodeIds].slice(0, 5),
      sampleEdgeIds: edges.slice(0, 5).map(e => e.id)
    });
  }
  
  return { nodes, edges };
}

/** Diagnostic flags from URL */
export function getDiagnosticFlags() {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    safeMode: params.get('safe') === '1',
    noOverlay: params.get('noOverlay') === '1', 
    noStagger: params.get('noStagger') === '1',
    verboseLog: params.get('log') === '1'
  };
}

/** Expose debug info to window for testing */
export function exposeDebugInfo(nodeCount: number, edgeCount: number, additional?: Record<string, any>) {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as any).__EDUTREE_DBG__ = { 
      nodeCount, 
      edgeCount, 
      timestamp: Date.now(),
      ...additional 
    };
  }
}
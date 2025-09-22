/**
 * Belt-and-suspenders regression assert for invisible metro edges
 * Development-only utility to catch edge routing issues pre-render
 */

import { Node, Edge } from '@xyflow/react';

export function assertNoInvisibleMetroEdges(nodes: Node[], edges: Edge[]): boolean {
  const visible = new Set(nodes.filter(n => !n.hidden).map(n => n.id));
  const bad = edges.filter(e => 
    e.type === 'metroGate' && (!visible.has(e.source) || !visible.has(e.target))
  );
  
  if (bad.length > 0) {
    console.warn('[Assert] Invisible metro edges detected:', bad.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceVisible: visible.has(e.source),
      targetVisible: visible.has(e.target)
    })));
  }
  
  return bad.length === 0;
}
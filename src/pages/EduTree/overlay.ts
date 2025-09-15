import { Node, Edge } from '@xyflow/react';

export function computeHighlights(nodes: Node[], edges: Edge[], trackNodeIds: Set<string>) {
  const nodeIds = new Set<string>([...trackNodeIds].map(String));

  const edgeIds = new Set<string>();
  edges.forEach(e => {
    const s = String(e.source), t = String(e.target);
    if (nodeIds.has(s) && nodeIds.has(t)) {
      const id = /^e-.+-.+$/.test(String(e.id)) ? String(e.id) : `e-${s}-${t}`;
      edgeIds.add(id);
    }
  });

  return { nodeIds, edgeIds };
}
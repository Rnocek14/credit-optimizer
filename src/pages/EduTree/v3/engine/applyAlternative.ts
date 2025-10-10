import type { GraphNode, GraphEdge } from '@/types/lifePathGraph';

export interface AlternativeSelection {
  sourceNodeId: string;      // Original node (e.g., "skill-math-fundamentals")
  selectedNodeId: string;    // Chosen alternative (e.g., "clep-algebra")
  timestamp: number;         // For history/analytics
}

export interface ApplyAlternativeResult {
  updatedGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  affectedNodeIds: string[];  // For position preservation
}

/**
 * Applies an alternative selection to the LifePath graph
 * Replaces the original spine edge with the selected alternative edge
 * 
 * @param original - The current LifePath graph (nodes + edges)
 * @param selection - The alternative being applied
 * @returns Updated graph with the alternative path activated
 */
export function applyAlternative(
  original: { nodes: GraphNode[]; edges: GraphEdge[] },
  selection: AlternativeSelection
): ApplyAlternativeResult {
  const { sourceNodeId, selectedNodeId } = selection;
  
  // Clone to avoid mutation
  const nodes = original.nodes.slice();
  const edges = original.edges.map(e => ({ ...e }));
  
  console.log('[ApplyAlt] Attempting to apply:', { sourceNodeId, selectedNodeId });
  
  // Find the alternative edge
  const altEdge = edges.find(
    e => e.type === 'alternative' &&
         e.sourceId === sourceNodeId &&
         e.targetId === selectedNodeId
  );
  
  if (!altEdge) {
    console.error('[ApplyAlt] Alternative edge not found:', {
      sourceNodeId,
      selectedNodeId,
      availableAlts: edges
        .filter(e => e.sourceId === sourceNodeId && e.type === 'alternative')
        .map(e => e.targetId)
    });
    return {
      updatedGraph: original,
      affectedNodeIds: []
    };
  }
  
  // Find existing spine edges from source (stacksInto, requires, enables)
  const spineTypes = ['stacksInto', 'requires', 'enables'];
  const spineIdx = edges.findIndex(
    e => e.sourceId === sourceNodeId && spineTypes.includes(e.type)
  );
  
  if (spineIdx >= 0) {
    // Replace existing spine edge with alternative
    const originalTarget = edges[spineIdx].targetId;
    
    edges[spineIdx] = {
      ...altEdge,
      type: 'stacksInto',  // Convert to spine type
      id: `stacks:${sourceNodeId}->${selectedNodeId}`
    };
    
    console.log('[ApplyAlt] Replaced spine edge:', {
      original: { from: sourceNodeId, to: originalTarget },
      new: { from: sourceNodeId, to: selectedNodeId }
    });
  } else {
    // No existing spine edge - add new one
    edges.push({
      ...altEdge,
      type: 'stacksInto',
      id: `stacks:${sourceNodeId}->${selectedNodeId}`
    });
    
    console.log('[ApplyAlt] Added new spine edge:', {
      from: sourceNodeId,
      to: selectedNodeId
    });
  }
  
  return {
    updatedGraph: { nodes, edges },
    affectedNodeIds: [sourceNodeId, selectedNodeId]
  };
}

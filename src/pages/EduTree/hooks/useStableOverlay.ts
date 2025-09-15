import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

interface TrackData {
  name: string;
  blockIds: string[];
  missingSlugs?: string[];
}

interface StableOverlayProps {
  overlayOn: boolean;
  nodes: Node[];
  edges: Edge[];
  primaryTrack?: TrackData;
  comparisonTrack?: TrackData;
}

interface StableOverlayResult {
  highlightedElements: {
    nodes: Node[];
    edges: Edge[];
  };
}

export function useStableOverlay({
  overlayOn,
  nodes,
  edges,
  primaryTrack,
  comparisonTrack
}: StableOverlayProps): StableOverlayResult {
  
  const highlightedElements = useMemo(() => {
    if (!overlayOn || !primaryTrack) {
      return { nodes, edges };
    }

    // Generate edge IDs from track block sequences
    const generateTrackEdgeIds = (blockIds: string[]) => {
      return blockIds.slice(0, -1).map((src, i) => `e-${src}-${blockIds[i + 1]}`);
    };

    const primaryEdgeIds = new Set(generateTrackEdgeIds(primaryTrack.blockIds));
    const comparisonEdgeIds = comparisonTrack 
      ? new Set(generateTrackEdgeIds(comparisonTrack.blockIds))
      : new Set();

    // Define highlight classes
    const hi = {
      node: 'ring-2 ring-primary/60 bg-primary/5',
      edge: 'stroke-primary stroke-2 opacity-100'
    };
    
    const dim = {
      node: 'opacity-40',
      edge: 'opacity-30'
    };

    // Create sets for intersection logic
    const primaryNodes = new Set(primaryTrack.blockIds);
    const comparisonNodes = new Set(comparisonTrack?.blockIds || []);
    
    const intersectNodes = new Set([...primaryNodes].filter(id => comparisonNodes.has(id)));
    const intersectEdges = new Set([...primaryEdgeIds].filter(id => comparisonEdgeIds.has(id)));

    // Kill "dim-only" fallback - show base classes when no matches
    const anyHi = intersectNodes.size > 0 || intersectEdges.size > 0;

    // Apply highlights to nodes
    const highlightedNodes = nodes.map(node => {
      const nodeId = String(node.id);
      const isHi = primaryNodes.has(nodeId) || comparisonNodes.has(nodeId);
      
      const cls = isHi
        ? [node.className, hi.node].filter(Boolean).join(' ')
        : anyHi
        ? [node.className, dim.node].filter(Boolean).join(' ')
        : (node.className ?? ''); // Keep base when no matches

      return { ...node, className: cls };
    });

    // Apply highlights to edges
    const highlightedEdges = edges.map(edge => {
      const edgeId = String(edge.id);
      const isHi = primaryEdgeIds.has(edgeId) || comparisonEdgeIds.has(edgeId);
      
      const cls = isHi
        ? [edge.className, hi.edge].filter(Boolean).join(' ')
        : anyHi
        ? [edge.className, dim.edge].filter(Boolean).join(' ')
        : (edge.className ?? ''); // Keep base when no matches

      return {
        ...edge,
        className: cls,
        style: {
          ...edge.style,
          ...(isHi && {
            strokeWidth: 3,
            opacity: 1
          })
        }
      };
    });

    return {
      nodes: highlightedNodes,
      edges: highlightedEdges
    };
  }, [overlayOn, nodes, edges, primaryTrack, comparisonTrack]);

  return { highlightedElements };
}
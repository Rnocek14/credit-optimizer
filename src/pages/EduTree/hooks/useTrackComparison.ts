import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { TRACK_MAP, type TrackId } from '../data/trackDefinitions';

// Edge ID normalization helper
export const eid = (source: string, target: string) => `e-${String(source)}-${String(target)}`;

export interface TrackHighlights {
  primaryNodes: Set<string>;
  primaryEdges: Set<string>;
  comparisonNodes: Set<string>;
  comparisonEdges: Set<string>;
  sharedNodes: Set<string>;
  sharedEdges: Set<string>;
}

export interface ResolvedTrack {
  name: string;
  blockIds: string[];
  missingSlugs: string[];
}

export interface UseTrackComparisonProps {
  nodes: Node[];
  edges: Edge[];
  resolvedPrimaryTrack?: ResolvedTrack | null;
  resolvedComparisonTrack?: ResolvedTrack | null;
  overlayEnabled: boolean;
}

export function useTrackComparison({
  nodes,
  edges,
  resolvedPrimaryTrack,
  resolvedComparisonTrack,
  overlayEnabled
}: UseTrackComparisonProps) {
  
  // Build node ID lookup map from rendered nodes
  const nodeIdByBlockId = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach(node => {
      // Extract block ID from node data
      const blockData = node.data as any;
      const blockId = blockData?.block?.id || blockData?.blockId || node.id;
      if (blockId) {
        map.set(blockId, node.id);
      }
    });
    return map;
  }, [nodes]);

  // Compute highlight sets
  const highlights = useMemo((): TrackHighlights => {
    if (!overlayEnabled || !resolvedPrimaryTrack) {
      return {
        primaryNodes: new Set(),
        primaryEdges: new Set(),
        comparisonNodes: new Set(),
        comparisonEdges: new Set(),
        sharedNodes: new Set(),
        sharedEdges: new Set()
      };
    }

    // Use resolved track data with database IDs
    const primaryNodeIds = new Set<string>();
    const primaryMissing: string[] = [];
    
    resolvedPrimaryTrack.blockIds.forEach(blockId => {
      const nodeId = nodeIdByBlockId.get(blockId);
      if (nodeId) {
        primaryNodeIds.add(nodeId);
      } else {
        primaryMissing.push(blockId);
      }
    });

    let comparisonNodeIds = new Set<string>();
    let comparisonMissing: string[] = [];
    
    if (resolvedComparisonTrack) {
      resolvedComparisonTrack.blockIds.forEach(blockId => {
        const nodeId = nodeIdByBlockId.get(blockId);
        if (nodeId) {
          comparisonNodeIds.add(nodeId);
        } else {
          comparisonMissing.push(blockId);
        }
      });
    }

    // Log resolution results
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Resolve ${resolvedPrimaryTrack.name}] resolved: ${primaryNodeIds.size}, missing: ${primaryMissing.length > 0 ? primaryMissing.join(', ') : 'none'}`);
      if (resolvedComparisonTrack) {
        console.log(`[Resolve ${resolvedComparisonTrack.name}] resolved: ${comparisonNodeIds.size}, missing: ${comparisonMissing.length > 0 ? comparisonMissing.join(', ') : 'none'}`);
      }
    }

    // Compute shared nodes
    const sharedNodeIds = new Set<string>();
    if (resolvedComparisonTrack) {
      primaryNodeIds.forEach(id => {
        if (comparisonNodeIds.has(id)) {
          sharedNodeIds.add(id);
        }
      });
    }

    // Generate edge sets based on node membership
    const primaryEdgeIds = new Set<string>();
    const comparisonEdgeIds = new Set<string>();
    const sharedEdgeIds = new Set<string>();

    edges.forEach(edge => {
      const edgeId = edge.id || eid(String(edge.source), String(edge.target));
      const sourceInPrimary = primaryNodeIds.has(String(edge.source));
      const targetInPrimary = primaryNodeIds.has(String(edge.target));
      const sourceInComparison = comparisonNodeIds.has(String(edge.source));
      const targetInComparison = comparisonNodeIds.has(String(edge.target));

      // Edge is in primary if both endpoints are in primary track
      if (sourceInPrimary && targetInPrimary) {
        primaryEdgeIds.add(edgeId);
      }

      // Edge is in comparison if both endpoints are in comparison track
      if (sourceInComparison && targetInComparison) {
        comparisonEdgeIds.add(edgeId);
      }

      // Edge is shared if it's in both tracks
      if (primaryEdgeIds.has(edgeId) && comparisonEdgeIds.has(edgeId)) {
        sharedEdgeIds.add(edgeId);
      }
    });

    return {
      primaryNodes: primaryNodeIds,
      primaryEdges: primaryEdgeIds,
      comparisonNodes: comparisonNodeIds,
      comparisonEdges: comparisonEdgeIds,
      sharedNodes: sharedNodeIds,
      sharedEdges: sharedEdgeIds
    };

  }, [overlayEnabled, resolvedPrimaryTrack, resolvedComparisonTrack, nodeIdByBlockId, edges]);

  // Apply highlight classes to nodes and edges
  const highlightedNodes = useMemo(() => {
    if (!overlayEnabled) return nodes;

    return nodes.map(node => {
      const classes = [node.className, 'node'].filter(Boolean);
      
      if (highlights.sharedNodes.has(node.id)) {
        classes.push('node--both');
      } else if (highlights.primaryNodes.has(node.id)) {
        classes.push('node--primary');
      } else if (highlights.comparisonNodes.has(node.id)) {
        classes.push('node--comparison');
      } else {
        classes.push('node--dim');
      }

      return {
        ...node,
        className: classes.join(' ')
      };
    });
  }, [nodes, highlights, overlayEnabled]);

  const highlightedEdges = useMemo(() => {
    if (!overlayEnabled) return edges;

    return edges.map(edge => {
      const edgeId = edge.id || eid(String(edge.source), String(edge.target));
      const classes = [edge.className, 'edge'].filter(Boolean);
      
      if (highlights.sharedEdges.has(edgeId)) {
        classes.push('edge--both');
      } else if (highlights.primaryEdges.has(edgeId)) {
        classes.push('edge--primary');
      } else if (highlights.comparisonEdges.has(edgeId)) {
        classes.push('edge--comparison');
      } else {
        classes.push('edge--dim');
      }

      return {
        ...edge,
        id: edgeId,
        className: classes.join(' ')
      };
    });
  }, [edges, highlights, overlayEnabled]);

  // Debug info
  const debugInfo = useMemo(() => ({
    overlayReady: overlayEnabled && !!resolvedPrimaryTrack,
    resolvedBlocks: nodeIdByBlockId.size,
    anyMatches: highlights.primaryNodes.size > 0,
    primaryCount: highlights.primaryNodes.size,
    comparisonCount: highlights.comparisonNodes.size,
    sharedCount: highlights.sharedNodes.size
  }), [overlayEnabled, resolvedPrimaryTrack, nodeIdByBlockId.size, highlights]);

  return {
    highlightedNodes,
    highlightedEdges,
    highlights,
    debugInfo
  };
}
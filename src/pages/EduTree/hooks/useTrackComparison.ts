import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { TRACK_MAP, type TrackId } from '../data/trackDefinitions';
import { applyComparisonLayout, isComparisonLayoutActive } from '../utils/comparisonLayout';

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

export interface UseTrackComparisonProps {
  nodes: Node[];
  edges: Edge[];
  primaryTrackId?: TrackId;
  comparisonTrackId?: TrackId;
  overlayEnabled: boolean;
  phaseAEnabled?: boolean;
}

export function useTrackComparison({
  nodes,
  edges,
  primaryTrackId,
  comparisonTrackId,
  overlayEnabled,
  phaseAEnabled = false
}: UseTrackComparisonProps) {
  
  // Build node ID lookup map from rendered nodes (by slug)
  const nodeIdByBlockId = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach(node => {
      // Extract block slug from node data
      const blockData = node.data as any;
      const blockSlug = blockData?.block?.slug || blockData?.slug || blockData?.blockSlug;
      if (blockSlug) {
        map.set(blockSlug, node.id);
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[NodeMapping] Total nodes:', nodes.length);
      console.log('[NodeMapping] Mapped by slug:', map.size);
      console.log('[NodeMapping] Sample mappings:', Array.from(map.entries()).slice(0, 3));
    }
    
    return map;
  }, [nodes]);

  // Compute highlight sets
  const highlights = useMemo((): TrackHighlights => {
    if (!overlayEnabled || !primaryTrackId) {
      return {
        primaryNodes: new Set(),
        primaryEdges: new Set(),
        comparisonNodes: new Set(),
        comparisonEdges: new Set(),
        sharedNodes: new Set(),
        sharedEdges: new Set()
      };
    }

    const primaryTrack = TRACK_MAP.get(primaryTrackId);
    const comparisonTrack = comparisonTrackId ? TRACK_MAP.get(comparisonTrackId) : undefined;

    if (!primaryTrack) {
      console.warn(`[TrackComparison] Primary track not found: ${primaryTrackId}`);
      return {
        primaryNodes: new Set(),
        primaryEdges: new Set(),
        comparisonNodes: new Set(),
        comparisonEdges: new Set(),
        sharedNodes: new Set(),
        sharedEdges: new Set()
      };
    }

    // Resolve block slugs to actual node IDs
    const primaryNodeIds = new Set<string>();
    const primaryMissing: string[] = [];
    
    primaryTrack.blockIds.forEach(blockSlug => {
      const nodeId = nodeIdByBlockId.get(blockSlug);
      if (nodeId) {
        primaryNodeIds.add(nodeId);
      } else {
        primaryMissing.push(blockSlug);
      }
    });

    let comparisonNodeIds = new Set<string>();
    let comparisonMissing: string[] = [];
    
    if (comparisonTrack) {
      comparisonTrack.blockIds.forEach(blockSlug => {
        const nodeId = nodeIdByBlockId.get(blockSlug);
        if (nodeId) {
          comparisonNodeIds.add(nodeId);
        } else {
          comparisonMissing.push(blockSlug);
        }
      });
    }

    // Log resolution results
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Resolve ${primaryTrackId}] resolved: ${primaryNodeIds.size}, missing: ${primaryMissing.length > 0 ? primaryMissing.join(', ') : 'none'}`);
      if (comparisonTrack) {
        console.log(`[Resolve ${comparisonTrackId}] resolved: ${comparisonNodeIds.size}, missing: ${comparisonMissing.length > 0 ? comparisonMissing.join(', ') : 'none'}`);
      }
    }

    // Compute shared nodes
    const sharedNodeIds = new Set<string>();
    if (comparisonTrack) {
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
      const sourceInPrimary = primaryNodeIds.has(String(edge.source));
      const targetInPrimary = primaryNodeIds.has(String(edge.target));
      const sourceInComparison = comparisonNodeIds.has(String(edge.source));
      const targetInComparison = comparisonNodeIds.has(String(edge.target));

      // Edge is in primary if both endpoints are in primary track
      if (sourceInPrimary && targetInPrimary) {
        primaryEdgeIds.add(edge.id);
      }

      // Edge is in comparison if both endpoints are in comparison track
      if (sourceInComparison && targetInComparison) {
        comparisonEdgeIds.add(edge.id);
      }

      // Edge is shared if it's in both tracks
      if (primaryEdgeIds.has(edge.id) && comparisonEdgeIds.has(edge.id)) {
        sharedEdgeIds.add(edge.id);
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

  }, [overlayEnabled, primaryTrackId, comparisonTrackId, nodeIdByBlockId, edges]);

  // Apply layout and highlight classes to nodes
  const highlightedNodes = useMemo(() => {
    if (!overlayEnabled) return nodes;

    // PhaseA Guard: Never reposition when PhaseA is active
    if (phaseAEnabled) {
      console.log('[Overlay][Guard] PhaseA active → overlay will style only (no positioning)');
      
      // Preserve all existing positions and grid layout flags
      let processedNodes = nodes.map(node => ({
        ...node,
        position: node.position,
        positionAbsolute: node.position,
        data: {
          ...node.data,
          // Preserve existing grid layout if it exists
          hasGridLayout: (node.data as any)?.hasGridLayout || false
        }
      }));
      
      // Apply only highlight classes, never reposition
      return processedNodes.map(node => {
        const baseClasses = node.className ? node.className.split(' ').filter(c => !c.startsWith('hl')) : [];
        let hlClass = 'hl';
        
        if (highlights.sharedNodes.has(node.id)) {
          hlClass += ' hl--both';
        } else if (highlights.primaryNodes.has(node.id)) {
          hlClass += ' hl--primary';
        } else if (highlights.comparisonNodes.has(node.id)) {
          hlClass += ' hl--comparison';
        } else {
          hlClass += ' hl--dim';
        }

        return {
          ...node,
          className: [...baseClasses, hlClass].join(' ')
        };
      });
    }

    // Legacy path: Check if we should apply comparison layout
    const useComparisonLayout = isComparisonLayoutActive(primaryTrackId, comparisonTrackId, overlayEnabled, phaseAEnabled);
    
    // Apply comparison layout if needed
    let processedNodes = useComparisonLayout 
      ? applyComparisonLayout(nodes, highlights)
      : nodes;

    // Apply highlight classes
    return processedNodes.map(node => {
      // Keep original classes but ensure clean highlight class management
      const baseClasses = node.className ? node.className.split(' ').filter(c => !c.startsWith('hl')) : [];
      let hlClass = 'hl';
      
      if (highlights.sharedNodes.has(node.id)) {
        hlClass += ' hl--both';
      } else if (highlights.primaryNodes.has(node.id)) {
        hlClass += ' hl--primary';
      } else if (highlights.comparisonNodes.has(node.id)) {
        hlClass += ' hl--comparison';
      } else {
        hlClass += ' hl--dim';
      }

      return {
        ...node,
        className: [...baseClasses, hlClass].join(' ')
      };
    });
  }, [nodes, highlights, overlayEnabled, primaryTrackId, comparisonTrackId]);

  const highlightedEdges = useMemo(() => {
    if (!overlayEnabled) return edges;

    return edges.map(edge => {
      // Preserve original classes but clean highlight management
      const baseClasses = edge.className ? edge.className.split(' ').filter(c => !c.startsWith('edge--')) : [];
      let hlClass = '';
      
      if (overlayEnabled) {
        if (highlights.sharedEdges.has(edge.id)) {
          hlClass = 'edge--both';
        } else if (highlights.primaryEdges.has(edge.id)) {
          hlClass = 'edge--primary';
        } else if (highlights.comparisonEdges.has(edge.id)) {
          hlClass = 'edge--comparison';
        } else {
          hlClass = 'edge--dim';
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[EdgeClass] ${edge.id}: base(${baseClasses.join(' ')}) + ${hlClass}`);
      }

      return {
        ...edge,
        className: [...baseClasses, hlClass].filter(Boolean).join(' ')
      };
    });
  }, [edges, highlights, overlayEnabled]);

  // Debug info
  const debugInfo = useMemo(() => ({
    overlayReady: overlayEnabled && !!primaryTrackId,
    resolvedBlocks: nodeIdByBlockId.size,
    anyMatches: highlights.primaryNodes.size > 0,
    primaryCount: highlights.primaryNodes.size,
    comparisonCount: highlights.comparisonNodes.size,
    sharedCount: highlights.sharedNodes.size
  }), [overlayEnabled, primaryTrackId, nodeIdByBlockId.size, highlights]);

  return {
    highlightedNodes,
    highlightedEdges,
    highlights,
    debugInfo
  };
}
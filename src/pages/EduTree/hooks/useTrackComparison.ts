import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { TRACK_MAP, type TrackId } from '../data/trackDefinitions';
import { GOLDEN_LAYOUT_SEED } from '../data/seedDataV2';

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
  blocks: any[];
  primaryTrackId?: TrackId;
  comparisonTrackId?: TrackId;
  primaryProgramId?: string;
  comparisonProgramId?: string;
  overlayEnabled: boolean;
}

export function useTrackComparison({
  nodes,
  edges,
  blocks,
  primaryTrackId,
  comparisonTrackId,
  primaryProgramId,
  comparisonProgramId,
  overlayEnabled
}: UseTrackComparisonProps) {
  
  // Node ID by Block ID mapping - resilient matching for data
  const nodeIdByBlockId = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach(node => {
      const d: any = node.data ?? {};
      // Try many keys in order
      const candidates = [
        d.block?.id, d.blockId, d.id,
        d.block?.slug, d.slug, d.blockSlug,
        node.id, // last resort: allow direct node.id matching
      ].filter(Boolean);

      for (const k of candidates) {
        map.set(String(k), node.id);
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[NodeMapping] nodes=', nodes.length, 'keys=', map.size);
    }
    return map;
  }, [nodes]);

  // Helper function to get program block IDs from visible blocks
  const getProgramBlockIds = useMemo(() => {
    return (programId: string): string[] => {
      const result = blocks
        .filter(b => !b.program_id || b.program_id === programId)
        .map(b => String(b.id));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[getProgramBlockIds]', {
          programId,
          totalBlocks: blocks.length,
          filteredBlocks: result.length,
          sampleBlockIds: result.slice(0, 3)
        });
      }
      
      return result;
    };
  }, [blocks]);

  // Compute highlight sets
  const highlights = useMemo((): TrackHighlights => {
    // Make overlay ready when comparing programs OR tracks
    const overlayReady = overlayEnabled && !!(primaryTrackId || primaryProgramId);
    if (!overlayReady) {
      return {
        primaryNodes: new Set(),
        primaryEdges: new Set(),
        comparisonNodes: new Set(),
        comparisonEdges: new Set(),
        sharedNodes: new Set(),
        sharedEdges: new Set()
      };
    }

    // Get block IDs for primary selection (track or program)
    let primaryBlockIds: string[] = [];
    if (primaryTrackId) {
      const primaryTrack = TRACK_MAP.get(primaryTrackId);
      if (primaryTrack) {
        primaryBlockIds = primaryTrack.blockIds;
      }
    } else if (primaryProgramId) {
      primaryBlockIds = getProgramBlockIds(primaryProgramId);
    }

    // Get block IDs for comparison selection (track or program)
    let comparisonBlockIds: string[] = [];
    if (comparisonTrackId) {
      const comparisonTrack = TRACK_MAP.get(comparisonTrackId);
      if (comparisonTrack) {
        comparisonBlockIds = comparisonTrack.blockIds;
      }
    } else if (comparisonProgramId) {
      comparisonBlockIds = getProgramBlockIds(comparisonProgramId);
    }

    if (primaryBlockIds.length === 0) {
      console.warn(`[TrackComparison] No blocks found for primary selection:`, { primaryTrackId, primaryProgramId });
      return {
        primaryNodes: new Set(),
        primaryEdges: new Set(),
        comparisonNodes: new Set(),
        comparisonEdges: new Set(),
        sharedNodes: new Set(),
        sharedEdges: new Set()
      };
    }

    // Resolve block IDs to actual node IDs
    const primaryNodeIds = new Set<string>();
    const primaryMissing: string[] = [];
    
    primaryBlockIds.forEach(blockId => {
      const nodeId = nodeIdByBlockId.get(blockId);
      if (nodeId) {
        primaryNodeIds.add(nodeId);
      } else {
        primaryMissing.push(blockId);
      }
    });

    let comparisonNodeIds = new Set<string>();
    let comparisonMissing: string[] = [];
    
    if (comparisonBlockIds.length > 0) {
      comparisonBlockIds.forEach(blockId => {
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
      const primaryLabel = primaryTrackId || primaryProgramId || 'unknown';
      const comparisonLabel = comparisonTrackId || comparisonProgramId || 'none';
      console.log(`[Resolve ${primaryLabel}] resolved: ${primaryNodeIds.size}, missing: ${primaryMissing.length > 0 ? primaryMissing.join(', ') : 'none'}`);
      if (comparisonBlockIds.length > 0) {
        console.log(`[Resolve ${comparisonLabel}] resolved: ${comparisonNodeIds.size}, missing: ${comparisonMissing.length > 0 ? comparisonMissing.join(', ') : 'none'}`);
      }
    }

    // Compute shared nodes
    const sharedNodeIds = new Set<string>();
    if (comparisonNodeIds.size > 0) {
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

  }, [overlayEnabled, primaryTrackId, comparisonTrackId, primaryProgramId, comparisonProgramId, nodeIdByBlockId, edges, getProgramBlockIds]);

  // Apply highlight classes to nodes and edges
  const highlightedNodes = useMemo(() => {
    if (!overlayEnabled) return nodes;

    return nodes.map(node => {
      // Clean class management - use helper function for better reliability
      const existingClasses = node.className?.split(' ').filter(c => !c.startsWith('hl--')) || [];
      let hlClass = '';
      
      if (highlights.sharedNodes.has(node.id)) {
        hlClass = 'hl--both';
      } else if (highlights.primaryNodes.has(node.id)) {
        hlClass = 'hl--primary';
      } else if (highlights.comparisonNodes.has(node.id)) {
        hlClass = 'hl--comparison';
      } else {
        hlClass = 'hl--dim';
      }

      return {
        ...node,
        className: [...existingClasses, hlClass].filter(Boolean).join(' ')
      };
    });
  }, [nodes, highlights, overlayEnabled]);

  const highlightedEdges = useMemo(() => {
    if (!overlayEnabled) return edges;

    return edges.map(edge => {
      // Clean edge class management
      const existingClasses = edge.className?.split(' ').filter(c => !c.startsWith('edge--')) || [];
      let hlClass = '';
      
      if (highlights.sharedEdges.has(edge.id)) {
        hlClass = 'edge--both';
      } else if (highlights.primaryEdges.has(edge.id)) {
        hlClass = 'edge--primary';
      } else if (highlights.comparisonEdges.has(edge.id)) {
        hlClass = 'edge--comparison';
      } else {
        hlClass = 'edge--dim';
      }

      return {
        ...edge,
        className: [...existingClasses, hlClass].filter(Boolean).join(' ')
      };
    });
  }, [edges, highlights, overlayEnabled]);

  // Debug info and legend counts for UI components
  const debugInfo = useMemo(() => ({
    overlayReady: overlayEnabled && !!(primaryTrackId || primaryProgramId),
    resolvedBlocks: nodeIdByBlockId.size,
    anyMatches: highlights.primaryNodes.size > 0,
    primaryCount: highlights.primaryNodes.size,
    comparisonCount: highlights.comparisonNodes.size,
    sharedCount: highlights.sharedNodes.size
  }), [overlayEnabled, primaryTrackId, primaryProgramId, nodeIdByBlockId.size, highlights]);

  // Calculate legend counts including dimmed nodes
  const legendCounts = useMemo(() => {
    if (!overlayEnabled || !highlights) return undefined;
    
    const totalNodes = nodes.length;
    const highlightedCount = highlights.primaryNodes.size + highlights.comparisonNodes.size + highlights.sharedNodes.size;
    const dimCount = Math.max(0, totalNodes - highlightedCount);
    
    return {
      primary: highlights.primaryNodes.size,
      comparison: highlights.comparisonNodes.size,
      shared: highlights.sharedNodes.size,
      dim: dimCount
    };
  }, [overlayEnabled, highlights, nodes.length]);

  return {
    highlightedNodes,
    highlightedEdges,
    highlights,
    debugInfo,
    legendCounts
  };
}
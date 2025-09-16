import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

interface TrackData {
  name: string;
  blockIds: string[];
  missingSlugs?: string[];
}

interface EnhancedOverlayProps {
  overlayEnabled: boolean;
  nodes: Node[];
  edges: Edge[];
  primaryTrack?: TrackData;
  comparisonTrack?: TrackData;
}

interface EnhancedOverlayResult {
  highlightedElements: {
    nodes: Node[];
    edges: Edge[];
  };
  trackStats: {
    shared: number;
    primaryOnly: number;
    comparisonOnly: number;
    divergencePoint: string | null;
  };
}

export function useEnhancedOverlay({
  overlayEnabled,
  nodes,
  edges,
  primaryTrack,
  comparisonTrack
}: EnhancedOverlayProps): EnhancedOverlayResult {
  
  const { highlightedElements, trackStats } = useMemo(() => {
    if (!overlayEnabled || !primaryTrack) {
      return { 
        highlightedElements: { nodes, edges },
        trackStats: { shared: 0, primaryOnly: 0, comparisonOnly: 0, divergencePoint: null }
      };
    }

    const primaryBlockIds = new Set(primaryTrack.blockIds);
    const comparisonBlockIds = new Set(comparisonTrack?.blockIds || []);
    
    // Find shared blocks (intersection)
    const sharedBlocks = new Set([...primaryBlockIds].filter(id => comparisonBlockIds.has(id)));
    
    // Find divergence point - first block where tracks differ
    let divergencePoint: string | null = null;
    if (comparisonTrack) {
      const maxLength = Math.max(primaryTrack.blockIds.length, comparisonTrack.blockIds.length);
      for (let i = 0; i < maxLength; i++) {
        const primaryBlock = primaryTrack.blockIds[i];
        const comparisonBlock = comparisonTrack.blockIds[i];
        if (primaryBlock !== comparisonBlock) {
          divergencePoint = primaryBlock || comparisonBlock;
          break;
        }
      }
    }

    // Generate edge IDs based on sequential flow
    const generateEdgeIds = (blockIds: string[]) => {
      return blockIds.slice(0, -1).map((src, i) => `e-${src}-${blockIds[i + 1]}`);
    };

    const primaryEdgeIds = new Set(generateEdgeIds(primaryTrack.blockIds));
    const comparisonEdgeIds = comparisonTrack ? new Set(generateEdgeIds(comparisonTrack.blockIds)) : new Set();
    const sharedEdgeIds = new Set([...primaryEdgeIds].filter(id => comparisonEdgeIds.has(id)));

    // Apply enhanced highlighting to nodes
    const highlightedNodes = nodes.map(node => {
      const nodeId = String(node.id);
      let highlightClass = '';
      
      if (sharedBlocks.has(nodeId)) {
        // Shared blocks - prominent green
        highlightClass = 'ring-2 ring-emerald-500/70 bg-emerald-50/50 border-emerald-300';
      } else if (primaryBlockIds.has(nodeId)) {
        // Primary track only - blue
        highlightClass = 'ring-2 ring-blue-500/70 bg-blue-50/50 border-blue-300';
      } else if (comparisonBlockIds.has(nodeId)) {
        // Comparison track only - orange
        highlightClass = 'ring-2 ring-orange-500/70 bg-orange-50/50 border-orange-300';
      } else if (comparisonTrack) {
        // Not in either track - dimmed
        highlightClass = 'opacity-30 grayscale';
      }

      return {
        ...node,
        className: [node.className, highlightClass].filter(Boolean).join(' ')
      };
    });

    // Apply enhanced highlighting to edges
    const highlightedEdges = edges.map(edge => {
      const edgeId = String(edge.id);
      let edgeStyle = { ...edge.style };
      let edgeClass = edge.className || '';
      
      if (sharedEdgeIds.has(edgeId)) {
        // Shared path - thick green line
        edgeStyle = {
          ...edgeStyle,
          stroke: '#10b981',
          strokeWidth: 4,
          opacity: 1
        };
        edgeClass += ' edge--shared';
      } else if (primaryEdgeIds.has(edgeId)) {
        // Primary track path - blue line
        edgeStyle = {
          ...edgeStyle,
          stroke: '#3b82f6',
          strokeWidth: 3,
          opacity: 1
        };
        edgeClass += ' edge--primary';
      } else if (comparisonEdgeIds.has(edgeId)) {
        // Comparison track path - dashed orange line
        edgeStyle = {
          ...edgeStyle,
          stroke: '#f97316',
          strokeWidth: 3,
          strokeDasharray: '8,4',
          opacity: 1
        };
        edgeClass += ' edge--comparison';
      } else if (comparisonTrack) {
        // Not in either track - dimmed
        edgeStyle = {
          ...edgeStyle,
          opacity: 0.2
        };
        edgeClass += ' edge--dimmed';
      }

      return {
        ...edge,
        className: edgeClass.trim(),
        style: edgeStyle
      };
    });

    return {
      highlightedElements: {
        nodes: highlightedNodes,
        edges: highlightedEdges
      },
      trackStats: {
        shared: sharedBlocks.size,
        primaryOnly: primaryBlockIds.size - sharedBlocks.size,
        comparisonOnly: comparisonBlockIds.size - sharedBlocks.size,
        divergencePoint
      }
    };
  }, [overlayEnabled, nodes, edges, primaryTrack, comparisonTrack]);

  return { highlightedElements, trackStats };
}
/**
 * Hook to apply dimming to nodes and edges based on path highlighting
 */
import { useMemo } from 'react';
import { usePathHighlight } from '../ctx/PathHighlightContext';

export function useApplyDimming(nodes: any[], edges: any[]) {
  const highlight = (() => {
    try { 
      return usePathHighlight(); 
    } catch { 
      return null; 
    }
  })();

  // Helper function to extract blockish data consistently
  const extractBlockish = (node: any) => {
    if (!node?.data) return null;
    
    const d = node.data;
    return {
      id: d.block?.id || node.id,
      program_id: d.block?.program_id || d.program_id || d.programId || null,
      track_id: d.block?.track_id || d.track_id || d.trackId || null,
      type: d.block?.type || d.type || node.type,
    };
  };

  const dimmedNodes = useMemo(() => {
    console.log('[useApplyDimming] Processing nodes:', {
      nodeCount: nodes.length,
      hasHighlight: !!highlight,
      activeKey: highlight?.activeKey,
      hoveredKey: highlight?.hoveredKey,
      lockedKey: highlight?.lockedKey
    });

    if (!highlight) return nodes;

    return nodes.map(node => {
      // Skip headers/gates for dimming - keep them visible for context
      if (node.type === 'header' || node.type === 'gate') {
        return node;
      }

      // Extract blockish data using helper function
      const blockish = extractBlockish(node);
      const dim = blockish ? highlight.isNodeDimmed(blockish) : false;
      const belongs = blockish ? highlight.belongs(blockish) : false;

      console.log('[useApplyDimming] Node dimming:', {
        nodeId: node.id,
        nodeType: node.type,
        blockish,
        dim,
        belongs,
        activeKey: highlight.activeKey
      });

      // Add visual highlighting classes
      let className = node.className || '';
      if (highlight.activeKey && blockish) {
        if (dim) {
          className = className.replace(/\bhl--\w+/g, '') + ' hl--dim';
        } else if (belongs) {
          className = className.replace(/\bhl--\w+/g, '') + ' hl--primary';
        }
      }

      return {
        ...node,
        className: className.trim(),
        data: { ...node.data, __dim: dim ? 1 : 0 },
        style: { ...(node.style || {}), opacity: dim ? 0.25 : 1 },
      };
    });
  }, [nodes, highlight?.activeKey, highlight?.hoveredKey, highlight?.lockedKey]);

  const dimmedEdges = useMemo(() => {
    console.log('[useApplyDimming] Processing edges:', {
      edgeCount: edges.length,
      hasHighlight: !!highlight,
      activeKey: highlight?.activeKey
    });

    if (!highlight) return edges;

    return edges.map(edge => {
      // Find source and target blocks using helper function
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      const sourceBlockish = extractBlockish(sourceNode);
      const targetBlockish = extractBlockish(targetNode);
      
      const dim = highlight.isEdgeDimmed(sourceBlockish, targetBlockish, edge.type);
      const sourceBelongs = sourceBlockish ? highlight.belongs(sourceBlockish) : false;
      const targetBelongs = targetBlockish ? highlight.belongs(targetBlockish) : false;

      console.log('[useApplyDimming] Edge dimming:', {
        edgeId: edge.id,
        edgeType: edge.type,
        sourceId: edge.source,
        targetId: edge.target,
        sourceBlockish,
        targetBlockish,
        dim,
        sourceBelongs,
        targetBelongs,
        activeKey: highlight.activeKey
      });

      // Add visual highlighting classes for edges
      let className = edge.className || '';
      if (highlight.activeKey) {
        if (dim) {
          className = className.replace(/\bedge--\w+/g, '') + ' edge--dim';
        } else if (sourceBelongs || targetBelongs) {
          className = className.replace(/\bedge--\w+/g, '') + ' edge--primary';
        }
      }

      return {
        ...edge,
        className: className.trim(),
        data: { ...edge.data, __dim: dim ? 1 : 0 },
        style: { ...(edge.style || {}), opacity: dim ? 0.25 : 1 },
      };
    });
  }, [edges, nodes, highlight?.activeKey, highlight?.hoveredKey, highlight?.lockedKey]);

  return { nodes: dimmedNodes, edges: dimmedEdges };
}

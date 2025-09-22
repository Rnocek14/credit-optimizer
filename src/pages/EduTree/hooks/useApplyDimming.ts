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

      // Extract blockish data for dimming check - Enhanced for V2 data structure
      const nodeData = node.data && typeof node.data === 'object' ? node.data : {};
      const blockish = {
        id: nodeData.block?.id || node.id,
        program_id: nodeData.block?.program_id || nodeData.program_id || nodeData.programId || null,
        track_id: nodeData.block?.track_id || nodeData.track_id || nodeData.trackId || null,
        type: nodeData.block?.type || nodeData.type || node.type,
      };

      const dim = highlight.isNodeDimmed(blockish);

      console.log('[useApplyDimming] Node dimming:', {
        nodeId: node.id,
        nodeType: node.type,
        blockish,
        dim,
        activeKey: highlight.activeKey
      });

      return {
        ...node,
        data: { ...node.data, __dim: dim ? 1 : 0 },
        style: { ...(node.style || {}), opacity: dim ? 0.25 : 1 },
      };
    });
  }, [nodes, highlight, highlight?.activeKey, highlight?.hoveredKey, highlight?.lockedKey]);

  const dimmedEdges = useMemo(() => {
    console.log('[useApplyDimming] Processing edges:', {
      edgeCount: edges.length,
      hasHighlight: !!highlight,
      activeKey: highlight?.activeKey
    });

    if (!highlight) return edges;

    return edges.map(edge => {
      // Find source and target blocks
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      const sourceNodeData = sourceNode?.data && typeof sourceNode.data === 'object' ? sourceNode.data : {};
      const sourceBlockish = {
        id: sourceNodeData.block?.id || sourceNode?.id,
        program_id: sourceNodeData.block?.program_id || sourceNodeData.program_id || sourceNodeData.programId || null,
        track_id: sourceNodeData.block?.track_id || sourceNodeData.track_id || sourceNodeData.trackId || null,
        type: sourceNodeData.block?.type || sourceNodeData.type || sourceNode?.type,
      };

      const targetNodeData = targetNode?.data && typeof targetNode.data === 'object' ? targetNode.data : {};
      const targetBlockish = {
        id: targetNodeData.block?.id || targetNode?.id,
        program_id: targetNodeData.block?.program_id || targetNodeData.program_id || targetNodeData.programId || null,
        track_id: targetNodeData.block?.track_id || targetNodeData.track_id || targetNodeData.trackId || null,
        type: targetNodeData.block?.type || targetNodeData.type || targetNode?.type,
      };

      const dim = highlight.isEdgeDimmed(sourceBlockish, targetBlockish, edge.type);

      console.log('[useApplyDimming] Edge dimming:', {
        edgeId: edge.id,
        edgeType: edge.type,
        sourceId: edge.source,
        targetId: edge.target,
        sourceBlockish,
        targetBlockish,
        dim,
        activeKey: highlight.activeKey
      });

      return {
        ...edge,
        data: { ...edge.data, __dim: dim ? 1 : 0 },
        style: { ...(edge.style || {}), opacity: dim ? 0.25 : 1 },
      };
    });
  }, [edges, nodes, highlight, highlight?.activeKey, highlight?.hoveredKey, highlight?.lockedKey]);

  return { nodes: dimmedNodes, edges: dimmedEdges };
}

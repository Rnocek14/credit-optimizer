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
    if (!highlight) return nodes;

    return nodes.map(node => {
      // Skip headers/gates for dimming - keep them visible for context
      if (node.type === 'header' || node.type === 'gate') {
        return node;
      }

      // Extract blockish data for dimming check
      const blockish = node.data && typeof node.data === 'object' ? {
        id: node.data.block?.id || node.id,
        program_id: node.data.programId || node.data.block?.program_id || null,
        track_id: node.data.trackId || node.data.block?.track_id || null,
        type: node.data.block?.type,
      } : null;

      const dim = highlight.isNodeDimmed(blockish);

      return {
        ...node,
        data: { ...node.data, __dim: dim ? 1 : 0 },
        style: { ...(node.style || {}), opacity: dim ? 0.25 : 1 },
      };
    });
  }, [nodes, highlight, highlight?.activeKey]);

  const dimmedEdges = useMemo(() => {
    if (!highlight) return edges;

    return edges.map(edge => {
      // Find source and target blocks
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      const sourceBlockish = sourceNode?.data ? {
        id: sourceNode.data.block?.id || sourceNode.id,
        program_id: sourceNode.data.programId || sourceNode.data.block?.program_id || null,
        track_id: sourceNode.data.trackId || sourceNode.data.block?.track_id || null,
        type: sourceNode.data.block?.type,
      } : null;

      const targetBlockish = targetNode?.data ? {
        id: targetNode.data.block?.id || targetNode.id,
        program_id: targetNode.data.programId || targetNode.data.block?.program_id || null,
        track_id: targetNode.data.trackId || targetNode.data.block?.track_id || null,
        type: targetNode.data.block?.type,
      } : null;

      const dim = highlight.isEdgeDimmed(sourceBlockish, targetBlockish, edge.type);

      return {
        ...edge,
        data: { ...edge.data, __dim: dim ? 1 : 0 },
        style: { ...(edge.style || {}), opacity: dim ? 0.25 : 1 },
      };
    });
  }, [edges, nodes, highlight, highlight?.activeKey]);

  return { nodes: dimmedNodes, edges: dimmedEdges };
}

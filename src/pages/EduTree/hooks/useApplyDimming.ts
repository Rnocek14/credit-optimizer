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

  // Build track-to-program mapping dynamically from nodes
  const trackToProgram = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      const blockish = extractBlockish(node);
      if (blockish?.track_id && blockish?.program_id) {
        map.set(blockish.track_id, blockish.program_id);
      }
    }
    return map;
  }, [nodes]);

  const dimmedNodes = useMemo(() => {
    if (import.meta.env.DEV) {
      console.log('[useApplyDimming] Processing nodes:', {
        nodeCount: nodes.length,
        hasHighlight: !!highlight,
        activeKey: highlight?.activeKey,
        trackToProgram: Object.fromEntries(trackToProgram)
      });
    }

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

      // Add visual highlighting classes
      let className = node.className || '';
      if (highlight.activeKey && blockish) {
        // Parse active key
        const [kind, val] = highlight.activeKey.split(':');
        const nodeTrack = blockish.track_id;
        const nodeProgram = blockish.program_id;
        
        // Determine active program dynamically
        const activeTrack = kind === 'track' ? val : null;
        const activeProgram = activeTrack ? trackToProgram.get(activeTrack) ?? null
                                          : (kind === 'program' ? val : null);
        
        // Define shared nodes: globally shared (no program, no track)
        const isGlobalShared = !nodeTrack && !nodeProgram;
        
        // Define program-shared: blocks that belong to active program but no specific track
        const isProgramShared = !nodeTrack && !!activeProgram && nodeProgram === activeProgram;
        
        // Combined shared for track highlighting
        const isSharedForTrack = !!activeTrack && (isGlobalShared || isProgramShared);
        
        if (dim) {
          className = className.replace(/\bhl--\w+/g, '') + ' hl--dim';
        } else if (activeTrack && isSharedForTrack) {
          className = className.replace(/\bhl--\w+/g, '') + ' hl--both';
        } else if (activeProgram && isGlobalShared) {
          className = className.replace(/\bhl--\w+/g, '') + ' hl--both';
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
  }, [nodes, trackToProgram, highlight?.activeKey, highlight?.hoveredKey, highlight?.lockedKey]);

  const dimmedEdges = useMemo(() => {
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

      // Add visual highlighting classes for edges
      let className = edge.className || '';
      if (highlight.activeKey) {
        // Parse active key
        const [kind, val] = highlight.activeKey.split(':');
        const activeTrack = kind === 'track' ? val : null;
        const activeProgram = activeTrack ? trackToProgram.get(activeTrack) ?? null
                                          : (kind === 'program' ? val : null);
        
        // Check if source is globally shared
        const sourceIsGloballyShared = sourceBlockish && 
          !sourceBlockish.track_id && !sourceBlockish.program_id;
        // Check if target is globally shared
        const targetIsGloballyShared = targetBlockish && 
          !targetBlockish.track_id && !targetBlockish.program_id;
        
        // Check if source is program shared (generic)
        const sourceIsProgramShared = sourceBlockish && 
          !sourceBlockish.track_id && !!activeProgram && 
          sourceBlockish.program_id === activeProgram;
        // Check if target is program shared (generic)
        const targetIsProgramShared = targetBlockish && 
          !targetBlockish.track_id && !!activeProgram && 
          targetBlockish.program_id === activeProgram;
        
        const isSharedEdge = sourceIsGloballyShared || targetIsGloballyShared || 
                           sourceIsProgramShared || targetIsProgramShared;
        
        if (dim) {
          className = className.replace(/\bedge--\w+/g, '') + ' edge--dim';
        } else if (isSharedEdge) {
          className = className.replace(/\bedge--\w+/g, '') + ' edge--both';
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
  }, [edges, nodes, trackToProgram, highlight?.activeKey, highlight?.hoveredKey, highlight?.lockedKey]);

  return { nodes: dimmedNodes, edges: dimmedEdges };
}

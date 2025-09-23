/**
 * Enhanced dimming hook supporting dual selection (compare-any) architecture
 * Replaces useApplyDimming with cross-discipline comparison support
 */

import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { usePathHighlight, type Selection, type Blockish } from '../ctx/PathHighlightContext';
import { withNodeHL, withEdgeHL } from '../utils/highlightClasses';

interface UseApplyDimmingV2Props {
  nodes: Node[];
  edges: Edge[];
}

interface UseApplyDimmingV2Result {
  nodes: Node[];
  edges: Edge[];
}

export function useApplyDimmingV2({ nodes, edges }: UseApplyDimmingV2Props): UseApplyDimmingV2Result {
  const highlight = usePathHighlight();

  // PHASE 2: Bound Highlight Sets to Live Nodes
  const liveNodeIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);
  
  console.log('[ApplyDimmingV2] Live node IDs:', Array.from(liveNodeIds));
  console.log('[ApplyDimmingV2] Highlight state:', {
    primarySelection: highlight.primarySelection,
    secondarySelection: highlight.secondarySelection,
    hoveredKey: highlight.hoveredKey,
    lockedKey: highlight.lockedKey
  });

  // Build trackToProgram map from current nodes
  const trackToProgram = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach(node => {
      const blockish = extractBlockish(node);
      if (blockish?.track_id && blockish?.program_id) {
        map.set(blockish.track_id, blockish.program_id);
      }
    });
    return map;
  }, [nodes]);

  // Helper to extract blockish data from different node structures
  function extractBlockish(node: any): Blockish | null {
    if (!node) return null;
    
    // Handle different data structures
    const data = node.data || {};
    const block = data.block || {};
    
    return {
      id: node.id,
      program_id: data.program_id || block.program_id || null,
      track_id: data.track_id || block.track_id || null,
      type: node.type || data.type || block.type
    };
  }

  // Enhanced membership logic with cross-discipline shared rules
  function belongsToSelection(blockish: Blockish | null, selection: Selection): boolean {
    if (!selection || !blockish) return false;

    const { kind, id } = selection;
    
    // PHASE 2: Only process nodes that are actually live
    if (!liveNodeIds.has(blockish.id || '')) {
      console.log('[ApplyDimmingV2] Filtering out non-live node:', blockish.id);
      return false;
    }

    if (kind === 'program') {
      return blockish.program_id === id;
    } else if (kind === 'track') {
      if (blockish.track_id === id) return true;
      
      // Program-shared blocks: check if track belongs to block's program
      if (blockish.program_id && !blockish.track_id) {
        const trackProgram = trackToProgram.get(id);
        return blockish.program_id === trackProgram;
      }
    }

    return false;
  }

  // Determine shared blocks based on comparison type
  function isSharedBetween(blockish: Blockish | null, primarySel: Selection, secondarySel: Selection | null): boolean {
    if (!blockish || !secondarySel) return false;

    // Global shared blocks (no program_id, no track_id) are always shared
    if (!blockish.program_id && !blockish.track_id) return true;

    const primaryKind = primarySel.kind;
    const secondaryKind = secondarySel.kind;

    // Cross-discipline shared rules from GPT's analysis:
    
    if (primaryKind === 'track' && secondaryKind === 'track') {
      // Track vs Track (same program): global + program-shared
      const primaryProgram = trackToProgram.get(primarySel.id);
      const secondaryProgram = trackToProgram.get(secondarySel.id);
      
      if (primaryProgram === secondaryProgram) {
        // Same program: include program-shared blocks
        return blockish.program_id === primaryProgram && !blockish.track_id;
      }
      // Different programs: only global-shared (already covered above)
      return false;
    }

    if (primaryKind === 'program' && secondaryKind === 'program') {
      // Program vs Program: global only (no program-shared)
      return false; // Global shared already covered above
    }

    if ((primaryKind === 'track' && secondaryKind === 'program') || 
        (primaryKind === 'program' && secondaryKind === 'track')) {
      // Track vs Program (DS ↔ Nursing): global only (treat as different programs)
      return false; // Global shared already covered above  
    }

    return false;
  }

  // Compute dimmed nodes with dual selection support
  const dimmedNodes = useMemo(() => {
    const { primarySelection, secondarySelection } = highlight;
    
    // PHASE 5: Add Debug Logging for node creation
    console.log('[ApplyDimmingV2] Processing nodes:', {
      nodeCount: nodes.length,
      primarySelection,
      secondarySelection,
      nodeTypes: nodes.reduce((acc, n) => {
        acc[n.type || 'unknown'] = (acc[n.type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Legacy single selection fallback
    if (!primarySelection && !secondarySelection) {
      return nodes.map(node => {
        const blockish = extractBlockish(node);
        const dimmed = highlight.isNodeDimmed(blockish);
        
        if (dimmed) {
          return {
            ...node,
            className: withNodeHL(node.className, 'hl--dim'),
            style: { ...node.style, opacity: 0.4 }
          };
        }
        return node;
      });
    }

    // Dual selection mode
    return nodes.map(node => {
      // Skip dimming for header and gate nodes
      if (node.type === 'header' || node.type === 'gate') {
        return node;
      }

      const blockish = extractBlockish(node);

      if (primarySelection && secondarySelection) {
        // Dual selection: compute A-only, B-only, shared, dim
        const belongsA = belongsToSelection(blockish, primarySelection);
        const belongsB = belongsToSelection(blockish, secondarySelection);
        const isShared = isSharedBetween(blockish, primarySelection, secondarySelection);

        if (isShared) {
          return { ...node, className: withNodeHL(node.className, 'hl--both'), style: { ...node.style, opacity: 1 } };
        } else if (belongsA) {
          return { ...node, className: withNodeHL(node.className, 'hl--primary'), style: { ...node.style, opacity: 1 } };
        } else if (belongsB) {
          return { ...node, className: withNodeHL(node.className, 'hl--comparison'), style: { ...node.style, opacity: 1 } };
        } else {
          return { ...node, className: withNodeHL(node.className, 'hl--dim'), style: { ...node.style, opacity: 0.25 } };
        }
      } else if (primarySelection) {
        // Primary selection only
        const belongsA = belongsToSelection(blockish, primarySelection);
        if (belongsA) {
          return { ...node, className: withNodeHL(node.className, 'hl--primary'), style: { ...node.style, opacity: 1 } };
        } else {
          return { ...node, className: withNodeHL(node.className, 'hl--dim'), style: { ...node.style, opacity: 0.25 } };
        }
      }

      return node;
    });
  }, [nodes, highlight.primarySelection, highlight.secondarySelection, highlight.isNodeDimmed, trackToProgram]);

  // Compute dimmed edges with dual selection support  
  const dimmedEdges = useMemo(() => {
    // ULTRA-DEFENSIVE edge pre-filtering - prevent React Flow corruption at dimming layer
    const validEdges = edges.filter(e => {
      // 1. Basic edge structure validation
      if (!e || typeof e.id !== 'string' || !e.source || !e.target) {
        if (import.meta.env.DEV) {
          console.error('[DIMMING] Malformed edge filtered:', e);
        }
        return false;
      }
      
      // 2. Comprehensive handle corruption detection
      const sourceHandle = e.sourceHandle;
      const targetHandle = e.targetHandle;
      
      // Check for TOXIC source handles (all variations)
      const hasToxicSource = (
        sourceHandle !== undefined && (
          sourceHandle === null ||
          sourceHandle === 'null' ||
          sourceHandle === 'undefined' ||
          sourceHandle === 'false' ||
          sourceHandle === 'NaN' ||
          typeof sourceHandle !== 'string' ||
          sourceHandle.trim() === '' ||
          sourceHandle.length === 0 ||
          /null|undefined|NaN/i.test(sourceHandle)
        )
      );
      
      // Check for TOXIC target handles (all variations)
      const hasToxicTarget = (
        targetHandle !== undefined && (
          targetHandle === null ||
          targetHandle === 'null' ||
          targetHandle === 'undefined' ||
          targetHandle === 'false' ||
          targetHandle === 'NaN' ||
          typeof targetHandle !== 'string' ||
          targetHandle.trim() === '' ||
          targetHandle.length === 0 ||
          /null|undefined|NaN/i.test(targetHandle)
        )
      );
      
      if (hasToxicSource || hasToxicTarget) {
        if (import.meta.env.DEV) {
          console.error('[DIMMING] TOXIC handles filtered at dimming layer:', {
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: sourceHandle,
            targetHandle: targetHandle,
            sourceHandleType: typeof sourceHandle,
            targetHandleType: typeof targetHandle,
            hasToxicSource,
            hasToxicTarget
          });
        }
        return false;
      }
      
      // 3. Self-loop validation
      if (e.source === e.target) {
        if (import.meta.env.DEV) {
          console.warn('[DIMMING] Self-loop edge filtered:', e.id);
        }
        return false;
      }
      
      return true;
    });
    
    const { primarySelection, secondarySelection } = highlight;
    
    // Legacy single selection fallback
    if (!primarySelection && !secondarySelection) {
      return validEdges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const sourceBlockish = extractBlockish(sourceNode);
        const targetBlockish = extractBlockish(targetNode);
        
        const dimmed = highlight.isEdgeDimmed(sourceBlockish, targetBlockish, edge.type);
        
        if (dimmed) {
          return {
            ...edge,
            className: withEdgeHL(edge.className, 'edge--dim'),
            style: { ...edge.style, opacity: 0.25 }
          };
        }
        return edge;
      });
    }

    // Dual selection mode
    return validEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const sourceBlockish = extractBlockish(sourceNode);
      const targetBlockish = extractBlockish(targetNode);

      let className = edge.className || '';
      let opacity = 1;

      if (primarySelection && secondarySelection) {
        // Dual selection edge logic
        const sourceA = belongsToSelection(sourceBlockish, primarySelection);
        const sourceB = belongsToSelection(sourceBlockish, secondarySelection);
        const targetA = belongsToSelection(targetBlockish, primarySelection);
        const targetB = belongsToSelection(targetBlockish, secondarySelection);
        
        const sourceShared = isSharedBetween(sourceBlockish, primarySelection, secondarySelection);
        const targetShared = isSharedBetween(targetBlockish, primarySelection, secondarySelection);

        // Gate/header edges: keep visible if either endpoint belongs
        const keepIfEither = edge.type === 'metroGate' || edge.type === 'gate';
        
        if (keepIfEither) {
          const hasConnection = sourceA || sourceB || targetA || targetB || sourceShared || targetShared;
          if (!hasConnection) {
            return { ...edge, className: withEdgeHL(edge.className, 'edge--dim'), style: { ...edge.style, opacity: 0.25 } };
          }
        } else {
          // Regular edges: both endpoints must match same selection
          const bothShared = sourceShared && targetShared;
          const bothA = (sourceA || sourceShared) && (targetA || sourceShared);
          const bothB = (sourceB || sourceShared) && (targetB || sourceShared);

          if (bothShared) {
            return { ...edge, className: withEdgeHL(edge.className, 'edge--both'), style: { ...edge.style, opacity: 1 } };
          } else if (bothA) {
            return { ...edge, className: withEdgeHL(edge.className, 'edge--primary'), style: { ...edge.style, opacity: 1 } };
          } else if (bothB) {
            return { ...edge, className: withEdgeHL(edge.className, 'edge--comparison'), style: { ...edge.style, opacity: 1 } };
          } else {
            return { ...edge, className: withEdgeHL(edge.className, 'edge--dim'), style: { ...edge.style, opacity: 0.25 } };
          }
        }
      } else if (primarySelection) {
        // Primary selection only
        const sourceA = belongsToSelection(sourceBlockish, primarySelection);
        const targetA = belongsToSelection(targetBlockish, primarySelection);
        
        if (sourceA && targetA) {
          return { ...edge, className: withEdgeHL(edge.className, 'edge--primary'), style: { ...edge.style, opacity: 1 } };
        } else {
          return { ...edge, className: withEdgeHL(edge.className, 'edge--dim'), style: { ...edge.style, opacity: 0.25 } };
        }
      }

      return edge;
    });
  }, [edges, nodes, highlight.primarySelection, highlight.secondarySelection, highlight.isEdgeDimmed, trackToProgram]);

  return {
    nodes: dimmedNodes,
    edges: dimmedEdges
  };
}

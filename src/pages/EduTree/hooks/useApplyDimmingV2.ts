/**
 * Enhanced dimming hook supporting dual selection (compare-any) architecture
 * Replaces useApplyDimming with cross-discipline comparison support
 */

import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { usePathHighlight, type Selection, type Blockish } from '../ctx/PathHighlightContext';

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

  // Build trackToProgram map from current nodes
  const trackToProgram = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach(node => {
      const blockish = extractBlockish(node);
      if (blockish?.track_id && blockish?.program_id) {
        map[blockish.track_id] = blockish.program_id;
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

    if (kind === 'program') {
      return blockish.program_id === id;
    } else if (kind === 'track') {
      if (blockish.track_id === id) return true;
      
      // Program-shared blocks: check if track belongs to block's program
      if (blockish.program_id && !blockish.track_id) {
        const trackProgram = trackToProgram[id];
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
      const primaryProgram = trackToProgram[primarySel.id];
      const secondaryProgram = trackToProgram[secondarySel.id];
      
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
    
    // Legacy single selection fallback
    if (!primarySelection && !secondarySelection) {
      return nodes.map(node => {
        const blockish = extractBlockish(node);
        const dimmed = highlight.isNodeDimmed(blockish);
        
        if (dimmed) {
          return {
            ...node,
            className: `${node.className || ''} hl--dim`.trim(),
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
      
      let className = node.className || '';
      let opacity = 1;

      if (primarySelection && secondarySelection) {
        // Dual selection: compute A-only, B-only, shared, dim
        const belongsA = belongsToSelection(blockish, primarySelection);
        const belongsB = belongsToSelection(blockish, secondarySelection);
        const isShared = isSharedBetween(blockish, primarySelection, secondarySelection);

        if (isShared) {
          className = `${className} hl--both`.trim();
        } else if (belongsA) {
          className = `${className} hl--primary`.trim();
        } else if (belongsB) {
          className = `${className} hl--comparison`.trim();
        } else {
          className = `${className} hl--dim`.trim();
          opacity = 0.25;
        }
      } else if (primarySelection) {
        // Primary selection only
        const belongsA = belongsToSelection(blockish, primarySelection);
        if (belongsA) {
          className = `${className} hl--primary`.trim();
        } else {
          className = `${className} hl--dim`.trim();
          opacity = 0.25;
        }
      }

      return {
        ...node,
        className,
        style: { ...node.style, opacity }
      };
    });
  }, [nodes, highlight.primarySelection, highlight.secondarySelection, highlight.isNodeDimmed, trackToProgram]);

  // Compute dimmed edges with dual selection support  
  const dimmedEdges = useMemo(() => {
    const { primarySelection, secondarySelection } = highlight;
    
    // Legacy single selection fallback
    if (!primarySelection && !secondarySelection) {
      return edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const sourceBlockish = extractBlockish(sourceNode);
        const targetBlockish = extractBlockish(targetNode);
        
        const dimmed = highlight.isEdgeDimmed(sourceBlockish, targetBlockish, edge.type);
        
        if (dimmed) {
          return {
            ...edge,
            className: `${edge.className || ''} edge--dim`.trim(),
            style: { ...edge.style, opacity: 0.25 }
          };
        }
        return edge;
      });
    }

    // Dual selection mode
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const sourceBlockish = extractBlockish(sourceNode);
      const targetBlockish = extractBlockish(targetNode);

      let className = edge.className || '';
      let opacity = 1;

      if (primarySelection && secondarySelection) {
        // Dual selection edge logic
        const sourceA = belongsToSelection(sourceBlockish, primarySelection);
        const sourceB = belongsToSelection(targetBlockish, secondarySelection);
        const targetA = belongsToSelection(sourceBlockish, primarySelection);
        const targetB = belongsToSelection(targetBlockish, secondarySelection);
        
        const sourceShared = isSharedBetween(sourceBlockish, primarySelection, secondarySelection);
        const targetShared = isSharedBetween(targetBlockish, primarySelection, secondarySelection);

        // Gate/header edges: keep visible if either endpoint belongs
        const keepIfEither = edge.type === 'metroGate' || edge.type === 'gate';
        
        if (keepIfEither) {
          const hasConnection = sourceA || sourceB || targetA || targetB || sourceShared || targetShared;
          if (!hasConnection) {
            className = `${className} edge--dim`.trim();
            opacity = 0.25;
          }
        } else {
          // Regular edges: both endpoints must match same selection
          const bothShared = sourceShared && targetShared;
          const bothA = (sourceA || sourceShared) && (targetA || sourceShared);
          const bothB = (sourceB || sourceShared) && (targetB || sourceShared);

          if (bothShared) {
            className = `${className} edge--both`.trim();
          } else if (bothA) {
            className = `${className} edge--primary`.trim();
          } else if (bothB) {
            className = `${className} edge--comparison`.trim();
          } else {
            className = `${className} edge--dim`.trim();
            opacity = 0.25;
          }
        }
      } else if (primarySelection) {
        // Primary selection only
        const sourceA = belongsToSelection(sourceBlockish, primarySelection);
        const targetA = belongsToSelection(targetBlockish, primarySelection);
        
        if (sourceA && targetA) {
          className = `${className} edge--primary`.trim();
        } else {
          className = `${className} edge--dim`.trim();
          opacity = 0.25;
        }
      }

      return {
        ...edge,
        className,
        style: { ...edge.style, opacity }
      };
    });
  }, [edges, nodes, highlight.primarySelection, highlight.secondarySelection, highlight.isEdgeDimmed, trackToProgram]);

  return {
    nodes: dimmedNodes,
    edges: dimmedEdges
  };
}

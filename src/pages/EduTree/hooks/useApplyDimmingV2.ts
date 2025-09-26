/**
 * Enhanced dimming hook supporting dual selection (compare-any) architecture
 * Now includes Auto-Mode support: single vs dual rendering modes
 */

import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { usePathHighlight, type Selection, type Blockish } from '../ctx/PathHighlightContext';
import { withNodeHL, withEdgeHL } from '../utils/highlightClasses';
import { deriveRenderMode, type RenderMode } from '../utils/renderMode';
import { useSuffixCompare } from './useSuffixCompare';

interface UseApplyDimmingV2Props {
  nodes: Node[];
  edges: Edge[];
}

interface UseApplyDimmingV2Result {
  nodes: Node[];
  edges: Edge[];
  mode: RenderMode;
}

export function useApplyDimmingV2({ nodes, edges }: UseApplyDimmingV2Props): UseApplyDimmingV2Result {
  const highlight = usePathHighlight();
  const { reachableSet } = useSuffixCompare({ edges });
  
  // Derive render mode from selections
  const mode = deriveRenderMode(highlight.primarySelection, highlight.secondarySelection);

  // PHASE 2: Bound Highlight Sets to Live Nodes
  const liveNodeIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[ApplyDimmingV2] Mode and state:', {
      mode,
      primarySelection: highlight.primarySelection,
      secondarySelection: highlight.secondarySelection,
      liveNodeCount: liveNodeIds.size
    });
  }

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

  // Compute dimmed nodes with Auto-Mode and Suffix support
  const dimmedNodes = useMemo(() => {
    const { primarySelection, secondarySelection } = highlight;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[ApplyDimmingV2] Processing nodes:', {
        mode,
        nodeCount: nodes.length,
        primarySelection,
        secondarySelection,
        suffixEnabled: !!reachableSet,
        suffixSize: reachableSet?.size
      });
    }
    
    // SINGLE MODE: Apply suffix constraint if enabled, otherwise return unchanged
    if (mode === 'single') {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ApplyDimmingV2] Single mode - applying suffix constraints if enabled');
      }
      
      // Apply ghost node coloring for all single mode scenarios (regardless of suffix)
      return nodes.map(node => {
        // Skip dimming for header and gate nodes
        if (node.type === 'header' || node.type === 'gate') {
          return node;
        }
        
        // Check for ghost/accelerated nodes (empty year nodes) - ALWAYS apply in single mode
        const isGhostNode = node.type === 'emptyYear' || 
                           node.id.startsWith('empty-year-') || 
                           node.data?.is_empty_year;
        if (isGhostNode) {
          return { ...node, className: withNodeHL(node.className, 'hl--ghost'), style: { ...node.style, opacity: 1 } };
        }
        
        // If suffix is enabled, apply highlighting within the reachable set
        if (reachableSet && primarySelection) {
          const blockish = extractBlockish(node);
          const inSuffix = reachableSet.has(node.id);
          
          if (inSuffix) {
            const belongsA = belongsToSelection(blockish, primarySelection);
            if (belongsA) {
              return { ...node, className: withNodeHL(node.className, 'hl--primary'), style: { ...node.style, opacity: 1 } };
            }
          }
          
          // All other nodes (outside suffix or don't belong to A) are dimmed
          return { ...node, className: withNodeHL(node.className, 'hl--dim'), style: { ...node.style, opacity: 0.25 } };
        }
        
        // If no suffix or primary selection, return node unchanged (except for ghost styling already applied)
        return node;
      });
    }

    // DUAL MODE: Apply overlay highlight classes with suffix support
    return nodes.map(node => {
      // Skip dimming for header and gate nodes
      if (node.type === 'header' || node.type === 'gate') {
        return node;
      }

      // Check for ghost/accelerated nodes (empty year nodes)
      const isGhostNode = node.type === 'emptyYear' || 
                         node.id.startsWith('empty-year-') || 
                         node.data?.is_empty_year;
      if (isGhostNode) {
        return { ...node, className: withNodeHL(node.className, 'hl--ghost'), style: { ...node.style, opacity: 1 } };
      }

      const blockish = extractBlockish(node);
      const inSuffix = reachableSet ? reachableSet.has(node.id) : true;

      // If suffix is enabled and node is not in reachable set, dim it
      if (reachableSet && !inSuffix) {
        return { ...node, className: withNodeHL(node.className, 'hl--dim'), style: { ...node.style, opacity: 0.25 } };
      }

      if (primarySelection && secondarySelection) {
        // Dual selection: compute A-only, B-only, shared, dim (within suffix if enabled)
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

  // Compute dimmed edges with Auto-Mode support
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
    
    // SINGLE MODE: Apply suffix constraint if enabled, otherwise return unchanged
    if (mode === 'single') {
      if (reachableSet && primarySelection) {
        return validEdges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          const sourceInSuffix = reachableSet.has(edge.source);
          const targetInSuffix = reachableSet.has(edge.target);
          
          // Both endpoints must be in suffix to be highlighted
          if (sourceInSuffix && targetInSuffix) {
            const sourceBlockish = extractBlockish(sourceNode);
            const targetBlockish = extractBlockish(targetNode);
            const sourceA = belongsToSelection(sourceBlockish, primarySelection);
            const targetA = belongsToSelection(targetBlockish, primarySelection);
            
            if (sourceA && targetA) {
              return { ...edge, className: withEdgeHL(edge.className, 'edge--primary'), style: { ...edge.style, opacity: 1 } };
            }
          }
          
          return { ...edge, className: withEdgeHL(edge.className, 'edge--dim'), style: { ...edge.style, opacity: 0.25 } };
        });
      }
      
      return validEdges;
    }

    // DUAL MODE: Apply overlay highlight classes with suffix support
    return validEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const sourceBlockish = extractBlockish(sourceNode);
      const targetBlockish = extractBlockish(targetNode);

      const sourceInSuffix = reachableSet ? reachableSet.has(edge.source) : true;
      const targetInSuffix = reachableSet ? reachableSet.has(edge.target) : true;

      // If suffix is enabled, both endpoints must be in suffix to be considered
      if (reachableSet && (!sourceInSuffix || !targetInSuffix)) {
        return { ...edge, className: withEdgeHL(edge.className, 'edge--dim'), style: { ...edge.style, opacity: 0.25 } };
      }

      if (primarySelection && secondarySelection) {
        // Dual selection edge logic (within suffix if enabled)
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
        // Primary selection only (within suffix if enabled)
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
  }, [edges, nodes, highlight.primarySelection, highlight.secondarySelection, mode, trackToProgram]);

  if (process.env.NODE_ENV === 'development') {
    console.log('[ApplyDimmingV2] Overlay sets:', {
      mode,
      primaryNodes: dimmedNodes.filter(n => n.className?.includes('hl--primary')).length,
      comparisonNodes: dimmedNodes.filter(n => n.className?.includes('hl--comparison')).length,
      bothNodes: dimmedNodes.filter(n => n.className?.includes('hl--both')).length,
      dimNodes: dimmedNodes.filter(n => n.className?.includes('hl--dim')).length,
      ghostNodes: dimmedNodes.filter(n => n.className?.includes('hl--ghost')).length,
    });
  }

  return {
    nodes: dimmedNodes,
    edges: dimmedEdges,
    mode
  };
}

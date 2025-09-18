import { resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';
import type { Node, Edge } from '@xyflow/react';

/**
 * PhaseA Layout Guard - Prevents layout competition by ensuring stable references
 * and single layout pass in PhaseA mode
 */

let phaseALayoutPassCount = 0;
let phaseANodesCache: Node[] | null = null;
let phaseAEdgesCache: Edge[] | null = null;
let lastDataHash = '';

export interface PhaseAGuardResult {
  shouldBypassOverlay: boolean;
  stableNodes: Node[];
  stableEdges: Edge[];
  layoutPassCount: number;
}

/**
 * Guards against layout competition in PhaseA mode
 */
export function usePhaseAGuard(
  nodes: Node[],
  edges: Edge[],
  overlayEnabled: boolean
): PhaseAGuardResult {
  const isPhaseA = resolveEduTreePhaseAFlag();
  
  // Create stable data hash to detect actual changes
  const currentDataHash = `${nodes.length}-${edges.length}-${nodes[0]?.id || ''}-${overlayEnabled}`;
  const dataChanged = currentDataHash !== lastDataHash;
  
  if (dataChanged) {
    lastDataHash = currentDataHash;
    phaseALayoutPassCount = 0;
    phaseANodesCache = null;
    phaseAEdgesCache = null;
  }

  if (!isPhaseA) {
    // Non-PhaseA mode - no guards needed
    return {
      shouldBypassOverlay: false,
      stableNodes: nodes,
      stableEdges: edges,
      layoutPassCount: 0
    };
  }

  // PhaseA mode - IMMEDIATE LAYOUT FREEZE after first pass
  phaseALayoutPassCount++;
  
  console.log('[PhaseAGuard] Layout pass:', phaseALayoutPassCount, {
    isPhaseA,
    overlayEnabled,
    dataChanged,
    nodesCount: nodes.length,
    edgesCount: edges.length
  });

  // EMERGENCY BRAKE - Only allow ONE layout pass to prevent scrambling
  if (phaseALayoutPassCount > 1) {
    console.warn('[PhaseAGuard] LAYOUT FREEZE: Preventing layout competition, using stable cache');
    return {
      shouldBypassOverlay: true,
      stableNodes: phaseANodesCache || nodes,
      stableEdges: phaseAEdgesCache || edges,
      layoutPassCount: phaseALayoutPassCount
    };
  }

  // Cache stable references for PhaseA - LOCK POSITIONS
  if (!phaseANodesCache || dataChanged) {
    phaseANodesCache = nodes.map(node => ({ 
      ...node,
      draggable: false,
      selectable: false,
      style: { 
        ...node.style,
        pointerEvents: 'none' // Prevent any interaction that could trigger repositioning
      }
    }));
  }
  
  if (!phaseAEdgesCache || dataChanged) {
    phaseAEdgesCache = edges.map(edge => ({ ...edge }));
  }

  return {
    shouldBypassOverlay: true, // Always bypass overlay in PhaseA
    stableNodes: phaseANodesCache,
    stableEdges: phaseAEdgesCache,
    layoutPassCount: phaseALayoutPassCount
  };
}

/**
 * Resets PhaseA guard state - call when transitioning modes
 */
export function resetPhaseAGuard() {
  phaseALayoutPassCount = 0;
  phaseANodesCache = null;
  phaseAEdgesCache = null;
  lastDataHash = '';
  console.log('[PhaseAGuard] State reset');
}
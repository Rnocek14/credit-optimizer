import { resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';
import type { Node, Edge } from '@xyflow/react';

/**
 * PhaseA Layout Guard - Prevents layout competition by ensuring stable references
 * and single layout pass in PhaseA mode
 */

let phaseALayoutSessionId = '';
let phaseALayoutAttempts = 0;
let phaseANodesCache: Node[] | null = null;
let phaseAEdgesCache: Edge[] | null = null;
let lastDataHash = '';
let layoutLocked = false;

export interface PhaseAGuardResult {
  shouldBypassOverlay: boolean;
  stableNodes: Node[];
  stableEdges: Edge[];
  layoutPassCount: number;
  startLayoutSession: () => void;
  isLayoutLocked: boolean;
}

/**
 * Guards against layout competition in PhaseA mode
 * NOW ONLY TRACKS ACTUAL LAYOUT ATTEMPTS, NOT RENDERS
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
    console.log('[PhaseAGuard] Data changed, resetting session');
    lastDataHash = currentDataHash;
    phaseALayoutSessionId = `session-${Date.now()}`;
    phaseALayoutAttempts = 0;
    phaseANodesCache = null;
    phaseAEdgesCache = null;
    layoutLocked = false;
  }

  if (!isPhaseA) {
    // Non-PhaseA mode - no guards needed
    return {
      shouldBypassOverlay: false,
      stableNodes: nodes,
      stableEdges: edges,
      layoutPassCount: 0,
      startLayoutSession: () => {},
      isLayoutLocked: false
    };
  }

  // Function to start a layout session (called only during actual layout attempts)
  const startLayoutSession = () => {
    if (layoutLocked) {
      console.warn('[PhaseAGuard] Layout is LOCKED - no more attempts allowed');
      return;
    }
    
    phaseALayoutAttempts++;
    console.log('[PhaseAGuard] Layout session started:', phaseALayoutAttempts, {
      sessionId: phaseALayoutSessionId,
      isPhaseA,
      overlayEnabled,
      nodesCount: nodes.length,
      edgesCount: edges.length
    });

    // EMERGENCY BRAKE - Only allow ONE layout attempt to prevent scrambling
    if (phaseALayoutAttempts > 1) {
      console.warn('[PhaseAGuard] LAYOUT FREEZE: Multiple attempts detected, locking layout');
      layoutLocked = true;
    }
  };

  // Cache stable references for PhaseA - LOCK POSITIONS
  if (!phaseANodesCache || dataChanged) {
    phaseANodesCache = nodes.map(node => ({ 
      ...node,
      draggable: false,
      selectable: false,
      style: { 
        ...node.style,
        pointerEvents: layoutLocked ? 'none' : node.style?.pointerEvents // Only lock interactions when layout is locked
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
    layoutPassCount: phaseALayoutAttempts,
    startLayoutSession,
    isLayoutLocked: layoutLocked
  };
}

/**
 * Resets PhaseA guard state - call when transitioning modes
 */
export function resetPhaseAGuard() {
  phaseALayoutSessionId = '';
  phaseALayoutAttempts = 0;
  phaseANodesCache = null;
  phaseAEdgesCache = null;
  lastDataHash = '';
  layoutLocked = false;
  console.log('[PhaseAGuard] State reset');
}
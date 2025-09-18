import { resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';
import type { Node, Edge } from '@xyflow/react';

/**
 * PhaseA Layout Guard - Circuit Breaker Pattern to Stop Layout Scrambling
 * EMERGENCY FIX: Complete layout freeze after first successful pass
 */

let phaseALayoutSessionId = '';
let phaseALayoutAttempts = 0;
let phaseANodesCache: Node[] | null = null;
let phaseAEdgesCache: Edge[] | null = null;
let lastDataHash = '';
let layoutLocked = false;
let circuitBreakerTripped = false; // EMERGENCY: Prevent any further layout attempts

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

  // CIRCUIT BREAKER: Stop all layout attempts after first success
  const startLayoutSession = () => {
    if (circuitBreakerTripped) {
      console.warn('[PhaseAGuard] CIRCUIT BREAKER TRIPPED - NO MORE LAYOUT ALLOWED');
      return;
    }
    
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

    // IMMEDIATE FREEZE - Prevent ANY scrambling by locking after first attempt
    if (phaseALayoutAttempts >= 1) {
      console.warn('[PhaseAGuard] EMERGENCY BRAKE: First layout complete, FREEZING POSITIONS');
      layoutLocked = true;
      circuitBreakerTripped = true; // NUCLEAR OPTION: No more layout ever
      
      // Add visual lock to DOM immediately
      setTimeout(() => {
        document.body.classList.add('phaseA-layout-locked');
      }, 0);
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
  circuitBreakerTripped = false; // Reset circuit breaker
  document.body.classList.remove('phaseA-layout-locked');
  console.log('[PhaseAGuard] State reset - circuit breaker cleared');
}
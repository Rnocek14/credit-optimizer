import type { Node, Edge } from '@xyflow/react';
import { resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';

/**
 * Master Layout Controller - Single Source of Truth
 * Eliminates all layout competition by being the only layout system
 */

// Global state for emergency layout control
let isLayoutLocked = false;
let masterPositions: Map<string, { x: number; y: number }> = new Map();
let reactFlowInstance: any = null;
let layoutAttempts = 0;
let lastStableData = '';
let isInitialized = false;

// Circuit breaker to prevent infinite loops
const MAX_LAYOUT_ATTEMPTS = 2;
const STABILITY_TIMEOUT = 100;

export interface MasterLayoutResult {
  nodes: Node[];
  edges: Edge[];
  isLocked: boolean;
  lockLayout: () => void;
  unlockLayout: () => void;
}

/**
 * EMERGENCY STABILIZED layout function - prevents infinite loops
 */
export function useMasterLayoutController(
  originalNodes: Node[],
  originalEdges: Edge[],
  overlayEnabled: boolean
): MasterLayoutResult {
  const isPhaseA = resolveEduTreePhaseAFlag();
  
  // Create data signature for stability detection
  const currentDataHash = `${originalNodes.length}-${originalEdges.length}`;
  
  // CIRCUIT BREAKER: Prevent excessive layout attempts
  if (layoutAttempts >= MAX_LAYOUT_ATTEMPTS && currentDataHash === lastStableData) {
    console.log('[MasterLayout] Circuit breaker activated - preventing layout loop');
    isLayoutLocked = true;
  }
  
  // STABILITY CHECK: Only process if data is genuinely different or not initialized
  const isStableData = currentDataHash === lastStableData && isInitialized;
  if (!isStableData) {
    console.log('[MasterLayout] New stable data detected:', currentDataHash);
    lastStableData = currentDataHash;
    layoutAttempts = 0;
    isInitialized = true;
  }
  
  // PHASE A: ONE-TIME INITIALIZATION ONLY
  if (isPhaseA && originalNodes.length > 0 && !isLayoutLocked && layoutAttempts < MAX_LAYOUT_ATTEMPTS) {
    console.log('[MasterLayout] PhaseA - ONE-TIME position capture and lock');
    layoutAttempts++;
    
    // EMERGENCY TIMEOUT to prevent hanging
    setTimeout(() => {
      // Capture current positions immediately
      originalNodes.forEach(node => {
        if (node.position) {
          masterPositions.set(node.id, { ...node.position });
        }
      });
      
      // PERMANENT LOCK - no more changes
      isLayoutLocked = true;
      document.body.classList.add('master-layout-locked');
      console.log('[MasterLayout] PhaseA - PERMANENTLY LOCKED');
    }, STABILITY_TIMEOUT);
  }
  
  const lockLayout = () => {
    console.log('[MasterLayout] Manual lock triggered');
    isLayoutLocked = true;
    document.body.classList.add('master-layout-locked');
  };
  
  const unlockLayout = () => {
    console.log('[MasterLayout] Manual unlock triggered');
    isLayoutLocked = false;
    masterPositions.clear();
    document.body.classList.remove('master-layout-locked');
  };
  
  // Apply master positioning
  const masterNodes = originalNodes.map(node => {
    const masterPos = masterPositions.get(node.id);
    
    if (isLayoutLocked && masterPos) {
      // LOCKED: Use master positions with no interactivity
      return {
        ...node,
        position: masterPos,
        draggable: false,
        selectable: false,
        style: {
          ...node.style,
          position: 'absolute' as const,
          transition: 'none',
          transform: 'none',
          willChange: 'auto' as const,
          pointerEvents: 'none' as const
        }
      };
    }
    
    // UNLOCKED: Normal positioning
    return node;
  });
  
  const masterEdges = originalEdges.map(edge => ({
    ...edge,
    style: {
      ...edge.style,
      transition: isLayoutLocked ? 'none !important' : edge.style?.transition
    }
  }));
  
  return {
    nodes: masterNodes,
    edges: masterEdges,
    isLocked: isLayoutLocked,
    lockLayout,
    unlockLayout
  };
}

/**
 * Register ReactFlow instance for direct control
 */
export function setReactFlowInstance(instance: any) {
  reactFlowInstance = instance;
  console.log('[MasterLayout] ReactFlow instance registered');
}

/**
 * EMERGENCY ONLY reset - use sparingly to prevent loops
 */
export function resetMasterLayoutController() {
  console.log('[MasterLayout] EMERGENCY reset - resetting all state');
  isLayoutLocked = false;
  masterPositions.clear();
  lastStableData = '';
  layoutAttempts = 0;
  isInitialized = false;
  reactFlowInstance = null;
  document.body.classList.remove('master-layout-locked');
}
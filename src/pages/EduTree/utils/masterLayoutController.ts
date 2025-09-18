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
let dataVersion = '';

export interface MasterLayoutResult {
  nodes: Node[];
  edges: Edge[];
  isLocked: boolean;
  lockLayout: () => void;
  unlockLayout: () => void;
}

/**
 * Single authoritative layout function - replaces all other layout systems
 */
export function useMasterLayoutController(
  originalNodes: Node[],
  originalEdges: Edge[],
  overlayEnabled: boolean
): MasterLayoutResult {
  const isPhaseA = resolveEduTreePhaseAFlag();
  
  // Create data version hash to detect changes
  const currentVersion = `${originalNodes.length}-${originalEdges.length}-${originalNodes[0]?.id || ''}-${overlayEnabled}`;
  
  // Reset on data change
  if (currentVersion !== dataVersion) {
    console.log('[MasterLayout] Data changed - resetting layout lock');
    dataVersion = currentVersion;
    isLayoutLocked = false;
    masterPositions.clear();
  }
  
  // PHASE A: Immediate lock after first positions are set
  if (isPhaseA && originalNodes.length > 0 && !isLayoutLocked) {
    console.log('[MasterLayout] PhaseA - Capturing positions and LOCKING forever');
    
    // Capture current positions immediately
    originalNodes.forEach(node => {
      if (node.position) {
        masterPositions.set(node.id, { ...node.position });
      }
    });
    
    // IMMEDIATE LOCK
    isLayoutLocked = true;
    
    // Disable ReactFlow internal positioning completely
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.setOptions?.({
          nodesDraggable: false,
          nodesConnectable: false,
          elementsSelectable: false,
          panOnDrag: true,
          zoomOnScroll: true,
          fitView: false,
          selectNodesOnDrag: false
        });
      }
      
      // Apply emergency CSS locks
      document.body.classList.add('master-layout-locked');
    }, 0);
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
 * Emergency reset for mode changes
 */
export function resetMasterLayoutController() {
  isLayoutLocked = false;
  masterPositions.clear();
  dataVersion = '';
  reactFlowInstance = null;
  document.body.classList.remove('master-layout-locked');
  console.log('[MasterLayout] Complete reset');
}
/**
 * PhaseA Layout Competition Prevention System
 * 
 * This utility ensures that when PhaseA is enabled, absolutely NO layout competition
 * occurs between our layout system and ReactFlow's internal positioning system.
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Create a PhaseA layout guard that prevents any object recreation or repositioning
 */
export class PhaseALayoutGuard {
  private static instance: PhaseALayoutGuard | null = null;
  private stableNodeRefs = new Map<string, Node>();
  private stableEdgeRefs = new Map<string, Edge>();
  private layoutPassCount = 0;
  
  static getInstance(): PhaseALayoutGuard {
    if (!PhaseALayoutGuard.instance) {
      PhaseALayoutGuard.instance = new PhaseALayoutGuard();
    }
    return PhaseALayoutGuard.instance;
  }
  
  /**
   * Get or create stable node references that never change
   */
  getStableNodes(nodes: Node[]): Node[] {
    // If we already have stable refs and the count matches, use those
    if (this.stableNodeRefs.size === nodes.length) {
      const existing = Array.from(this.stableNodeRefs.values());
      console.log('[PhaseAGuard] Using existing stable references:', existing.length);
      return existing;
    }
    
    // First time or count changed - create new stable references
    console.log('[PhaseAGuard] Creating new stable references for', nodes.length, 'nodes');
    this.stableNodeRefs.clear();
    
    const stableNodes = nodes.map(node => {
      const stableNode = {
        ...node,
        // Ensure position is locked
        position: node.position || { x: 0, y: 0 },
        draggable: false,
        selectable: false,
        data: {
          ...node.data,
          phaseALocked: true,
          stableReference: true
        }
      };
      
      this.stableNodeRefs.set(node.id, stableNode);
      return stableNode;
    });
    
    return stableNodes;
  }
  
  /**
   * Get or create stable edge references
   */
  getStableEdges(edges: Edge[]): Edge[] {
    // If we already have stable refs and the count matches, use those
    if (this.stableEdgeRefs.size === edges.length) {
      const existing = Array.from(this.stableEdgeRefs.values());
      console.log('[PhaseAGuard] Using existing stable edge references:', existing.length);
      return existing;
    }
    
    // First time or count changed - create new stable references
    console.log('[PhaseAGuard] Creating new stable edge references for', edges.length, 'edges');
    this.stableEdgeRefs.clear();
    
    const stableEdges = edges.map(edge => {
      const stableEdge = {
        ...edge,
        data: {
          ...edge.data,
          phaseALocked: true,
          stableReference: true
        }
      };
      
      this.stableEdgeRefs.set(edge.id, stableEdge);
      return stableEdge;
    });
    
    return stableEdges;
  }
  
  /**
   * Track and validate that only ONE layout pass occurs
   */
  trackLayoutPass(passType: string): boolean {
    this.layoutPassCount++;
    console.log(`[PhaseAGuard] Layout pass #${this.layoutPassCount}: ${passType}`);
    
    // Alert if multiple passes detected
    if (this.layoutPassCount > 1) {
      console.error(`[PhaseAGuard] LAYOUT COMPETITION DETECTED! Pass #${this.layoutPassCount}: ${passType}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Reset the guard for a new layout cycle
   */
  reset() {
    console.log('[PhaseAGuard] Resetting guard state');
    this.layoutPassCount = 0;
    // Keep stable references - don't clear them
  }
  
  /**
   * Complete shutdown and cleanup
   */
  shutdown() {
    console.log('[PhaseAGuard] Complete shutdown');
    this.stableNodeRefs.clear();
    this.stableEdgeRefs.clear();
    this.layoutPassCount = 0;
  }
}

/**
 * Global instance for easy access
 */
export const phaseAGuard = PhaseALayoutGuard.getInstance();

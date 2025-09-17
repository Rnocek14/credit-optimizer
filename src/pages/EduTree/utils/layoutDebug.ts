// Layout debugging utilities to track position changes and layout competition
import type { Node } from '@xyflow/react';

interface LayoutDebugInfo {
  timestamp: number;
  action: string;
  nodeCount: number;
  samplePositions: Array<{ id: string; x: number; y: number }>;
  layoutPass: string;
}

class LayoutDebugger {
  private history: LayoutDebugInfo[] = [];
  
  logLayoutAction(action: string, nodes: Node[], layoutPass: string = 'unknown') {
    const timestamp = Date.now();
    const samplePositions = nodes.slice(0, 5).map(n => ({
      id: n.id,
      x: n.position?.x || 0,
      y: n.position?.y || 0
    }));
    
    const info: LayoutDebugInfo = {
      timestamp,
      action,
      nodeCount: nodes.length,
      samplePositions,
      layoutPass
    };
    
    this.history.push(info);
    
    // Keep only last 20 entries
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
    
    console.log(`[LayoutDebug][${layoutPass}] ${action}:`, {
      nodeCount: nodes.length,
      samplePositions,
      timestamp: new Date(timestamp).toISOString()
    });
  }
  
  detectPositionChanges(beforeNodes: Node[], afterNodes: Node[]): boolean {
    const changes: Array<{ id: string; before: any; after: any }> = [];
    
    beforeNodes.forEach(before => {
      const after = afterNodes.find(n => n.id === before.id);
      if (!after) return;
      
      const dx = Math.abs((before.position?.x || 0) - (after.position?.x || 0));
      const dy = Math.abs((before.position?.y || 0) - (after.position?.y || 0));
      
      if (dx > 1 || dy > 1) {
        changes.push({
          id: before.id,
          before: before.position,
          after: after.position
        });
      }
    });
    
    if (changes.length > 0) {
      console.warn('[LayoutDebug][Competition] Position changes detected:', changes);
      return true;
    }
    
    return false;
  }
  
  getHistory() {
    return [...this.history];
  }
  
  exportDebugData() {
    const debugData = {
      layoutHistory: this.history,
      layoutPasses: (window as any).__layoutPasses || [],
      currentNodes: (window as any).__flowNodes__ || [],
      timestamp: Date.now()
    };
    
    console.log('[LayoutDebug] Full debug export:', debugData);
    return debugData;
  }
}

export const layoutDebugger = new LayoutDebugger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).layoutDebugger = layoutDebugger;
}

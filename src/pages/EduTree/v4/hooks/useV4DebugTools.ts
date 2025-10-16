/**
 * V4 Debug Tools Hook
 * Provides snapshot export and graph diagnostics
 */

import { useMemo } from 'react';
import { PlanNode, PlanEdge, OverlayState, V4DebugState } from '../types/v4';

export function useV4DebugTools(
  nodes: PlanNode[],
  edges: PlanEdge[],
  overlays: OverlayState,
  lastFitView?: number
): V4DebugState & {
  exportSnapshot: () => void;
  validateGraph: () => { valid: boolean; errors: string[] };
} {
  const layoutHash = useMemo(() => {
    const nodeIds = nodes.map(n => n.id).sort().join(',');
    const edgeIds = edges.map(e => e.id).sort().join(',');
    const overlayStr = Object.entries(overlays)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(',');
    return `${nodeIds}|${edgeIds}|${overlayStr}`;
  }, [nodes, edges, overlays]);

  const activeOverlay = useMemo(() => {
    const active = Object.entries(overlays).find(([_, v]) => v);
    return active ? (active[0] as keyof OverlayState) : null;
  }, [overlays]);

  const debugState: V4DebugState = {
    visibleNodes: nodes.map(n => n.id),
    activeOverlay,
    layoutHash,
    lastFitView,
    memoryUsage: typeof window !== 'undefined' && 'memory' in performance 
      ? (performance as any).memory?.usedJSHeapSize 
      : undefined
  };

  const exportSnapshot = () => {
    const snapshot = {
      ...debugState,
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      overlays,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, className: n.className })),
      edges: edges.map(e => ({ id: e.id, type: e.type, hidden: e.hidden }))
    };
    
    console.log('[V4 Debug Snapshot]', snapshot);
    
    // Copy to clipboard if available
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      console.log('✅ Snapshot copied to clipboard');
    }
  };

  const validateGraph = () => {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Check for broken edges
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} has invalid source: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} has invalid target: ${edge.target}`);
      }
    });
    
    // Check for offscreen nodes (basic check)
    nodes.forEach(node => {
      if (node.position.x < -1000 || node.position.x > 5000) {
        errors.push(`Node ${node.id} has extreme x position: ${node.position.x}`);
      }
      if (node.position.y < -1000 || node.position.y > 5000) {
        errors.push(`Node ${node.id} has extreme y position: ${node.position.y}`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  };

  return {
    ...debugState,
    exportSnapshot,
    validateGraph
  };
}

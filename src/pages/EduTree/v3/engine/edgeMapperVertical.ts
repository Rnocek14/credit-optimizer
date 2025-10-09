/**
 * Edge mapper for vertical flow
 * 
 * All edges are uniform:
 * - Type: smoothstep (curved paths)
 * - Handles: top/bottom only
 * - Animation: gate edges only
 * - Styling: consistent colors and widths
 */

import type { Edge, MarkerType } from '@xyflow/react';
import type { V3Edge } from '../types/v3';

export function mapEdgesVertical(edges: V3Edge[], nodes?: any[]): Edge[] {
  // Build node map for validation (optional)
  const nodeMap = nodes ? new Map(nodes.map(n => [n.id, n])) : null;
  
  return edges
    .filter(e => {
      // FIX #1: Never drop checkpoint edges - preserve them before validation
      const isCheckpoint = (e.data as any)?.isCheckpointEdge || e.id.startsWith('ckpt:');
      if (isCheckpoint) {
        if (import.meta.env.DEV) {
          console.log('[EdgeMapper] Preserving checkpoint edge:', { 
            id: e.id, 
            source: e.source, 
            target: e.target 
          });
        }
        return true; // Always keep checkpoint edges
      }
      
      // Dev guard: filter OTHER invalid edges
      if (nodeMap) {
        const hasSource = nodeMap.has(e.source);
        const hasTarget = nodeMap.has(e.target);
        const selfLoop = e.source === e.target;
        
        if (!hasSource || !hasTarget || selfLoop) {
          if (import.meta.env.DEV) {
            console.error('[EdgeMapper] Invalid edge:', { 
              id: e.id, 
              source: e.source, 
              target: e.target,
              hasSource,
              hasTarget,
              selfLoop 
            });
          }
          return false;
        }
      }
      return true;
    })
    .map(e => {
      // Detect checkpoint edges and style them as spine (not gate)
      const isCheckpoint = (e.data as any)?.isCheckpointEdge || e.id.startsWith('ckpt:');
      const isGate = !isCheckpoint && e.kind === 'gate';
      const isMerge = e.source.includes('y3-') && e.target.includes('y4-');
      
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        
        // All edges connect top-to-bottom
        sourceHandle: 'south',
        targetHandle: 'north',
        
        // Uniform smoothstep with gentle curves (softer for merge)
        type: 'smoothstep' as const,
        pathOptions: { borderRadius: isMerge ? 24 : 12 },
        
        // Arrowheads for all edges
        markerEnd: { 
          type: 'arrowclosed' as MarkerType,
          width: 18, 
          height: 18,
          color: isGate ? '#6366f1' : '#94a3b8'
        },
        
        // Subtle animation for gate edges only (NOT checkpoints)
        animated: isGate,
        
        // Consistent styling (checkpoint edges use spine color)
        style: {
          stroke: isGate ? '#6366f1' : '#94a3b8',
          strokeWidth: 2,
          opacity: 1,
        },
      };
    });
}

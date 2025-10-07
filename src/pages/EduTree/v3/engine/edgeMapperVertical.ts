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

export function mapEdgesVertical(edges: V3Edge[]): Edge[] {
  return edges.map(e => {
    const isGate = e.kind === 'gate';
    
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      
      // All edges connect top-to-bottom
      sourceHandle: 'south',
      targetHandle: 'north',
      
      // Uniform smoothstep with gentle curves
      type: 'smoothstep' as const,
      pathOptions: { borderRadius: 12 },
      
      // Arrowheads for all edges
      markerEnd: { 
        type: 'arrowclosed' as MarkerType,
        width: 18, 
        height: 18,
        color: isGate ? '#6366f1' : '#94a3b8'
      },
      
      // Subtle animation for gate edges only
      animated: isGate,
      
      // Consistent styling
      style: {
        stroke: isGate ? '#6366f1' : '#94a3b8',
        strokeWidth: 2,
        opacity: 1,
      },
    };
  });
}

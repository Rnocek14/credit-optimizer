import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { GraphEdge } from '@/types/lifePathGraph';
import { Badge } from '@/components/ui/badge';
import { determineEdgeGhostStatus } from '@/lib/pathfinding/ghosting';

interface LifePathEdgeData {
  edge: GraphEdge;
  isHighlighted: boolean;
  pathType?: string;
  tier?: 'on-path' | 'related' | 'off-path';
}

interface LifePathEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  data: LifePathEdgeData;
  markerEnd?: string;
}

export function LifePathEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: LifePathEdgeProps) {
  const { edge, isHighlighted, tier } = data;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getEdgeStyle = () => {
    // Visual V2: Use tier-based styling if available
    if (tier) {
      const baseStyle = {
        strokeWidth: tier === 'on-path' ? 3 : tier === 'related' ? 2 : 1,
        opacity: tier === 'on-path' ? 1 : tier === 'related' ? 0.6 : 0.25,
      };

      // Use semantic colors based on tier
      switch (tier) {
        case 'on-path':
          return { ...baseStyle, stroke: 'hsl(var(--primary))' };
        case 'related':
          return { ...baseStyle, stroke: 'hsl(var(--muted-foreground))' };
        case 'off-path':
          return { ...baseStyle, stroke: 'hsl(var(--muted-foreground))' };
      }
    }

    // Legacy styling
    const baseStyle = {
      strokeWidth: isHighlighted ? 3 : 1.5,
    };

    switch (edge.type) {
      case 'requires':
        return { ...baseStyle, stroke: 'hsl(var(--primary))' };
      case 'enables':
        return { ...baseStyle, stroke: 'hsl(var(--secondary))' };
      case 'substitutes':
        return { ...baseStyle, stroke: 'hsl(var(--accent))', strokeDasharray: '8,4' };
      case 'creditTransfersTo':
        return { ...baseStyle, stroke: 'hsl(var(--secondary))' };
      case 'ghost':
        return { ...baseStyle, stroke: 'hsl(var(--destructive))', strokeDasharray: '4,4', opacity: 0.6 };
      case 'alternative':
        return { ...baseStyle, stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '6,3' };
      default:
        return { ...baseStyle, stroke: 'hsl(var(--muted-foreground))' };
    }
  };

  const getEdgeLabel = () => {
    // Always show transfer info, even in filtered views (Phase 1 requirement)
    if (edge.type === 'creditTransfersTo') {
      const rate = typeof edge.creditTransferRate === 'number' ? edge.creditTransferRate : 1;
      const pct = Math.max(0, Math.min(100, Math.round(rate * 100)));
      return `${pct}% transfer`;
    }
    
    // Collapsed transfer info for crowded views
    if (edge.metadata?.transferCount && edge.metadata.transferCount > 1) {
      return `• +${edge.metadata.transferCount} transfers`;
    }
    
    if (edge.type === 'alternative') return 'Alt';
    if (edge.type === 'equivalentTo') return 'Equivalent';
    if (edge.type === 'ghost') return 'Ghost';
    if (edge.type === 'buildsSkill') return 'Builds';
    return null;
  };

  const getLabelColor = () => {
    if (edge.type === "creditTransfersTo") {
      const label = getEdgeLabel();
      const pct = parseInt((label || "100").replace(/\D/g, ""), 10) || 100;
      if (pct === 100) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200";
      if (pct >= 80) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200";
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200";
    }
    if (edge.type === "equivalentTo")
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200";
    if (edge.type === "alternative")
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200";
    if (edge.type === "ghost")
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-200";
  };

  const label = getEdgeLabel();

  return (
    <g data-testid="lp-edge" data-edge-id={edge.id}>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={getEdgeStyle()} 
      />
      
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: labelX,
              top: labelY,
            }}
          >
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-1 border font-medium shadow-sm ${getLabelColor()}`}
              data-testid="lp-edge-label"
            >
              {label}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}
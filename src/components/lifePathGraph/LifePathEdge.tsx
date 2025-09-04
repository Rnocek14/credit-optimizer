import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { GraphEdge } from '@/types/lifePathGraph';
import { Badge } from '@/components/ui/badge';
import { determineEdgeGhostStatus } from '@/lib/pathfinding/ghosting';
import { LP_VISUAL_V2 } from '@/lib/flags';

interface LifePathEdgeData {
  edge: GraphEdge;
  isHighlighted: boolean;
  pathType?: string;
  tier?: 'on-path' | 'related' | 'off-path';
  isRelatedToHovered?: boolean;
  showPreviousPath?: boolean;
  label?: string;
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
  const { edge, isHighlighted, tier, isRelatedToHovered = false, showPreviousPath = false, label } = data;

  // Add padding to avoid nodes when V2 is enabled
  const pad = LP_VISUAL_V2 ? 16 : 0;
  const adjustedSourceX = sourcePosition === 'right' ? sourceX + pad : sourceX - pad;
  const adjustedTargetX = targetPosition === 'left' ? targetX - pad : targetX + pad;

  // Use SmoothStep routing in Visual V2 for better orthogonal paths
  const [edgePath, labelX, labelY] = LP_VISUAL_V2 
    ? getSmoothStepPath({
        sourceX: adjustedSourceX,
        sourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY,
        targetPosition,
        borderRadius: 12,
      })
    : getBezierPath({
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
      let opacity = tier === 'on-path' ? 1 : tier === 'related' ? 0.6 : 0.25;
      let strokeWidth = tier === 'on-path' ? 3 : tier === 'related' ? 2 : 1;
      
      if (isRelatedToHovered) {
        opacity = Math.min(1, opacity + 0.4);
        strokeWidth += 1;
      }
      
      if (showPreviousPath) {
        opacity = 0.3;
      }
      
      const baseStyle = { strokeWidth, opacity };

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
    
    // Use provided label if available
    if (label) return label;
    
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
      const labelText = getEdgeLabel();
      const pct = parseInt((labelText || "100").replace(/\D/g, ""), 10) || 100;
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

  const displayLabel = getEdgeLabel();
  const tierClass = tier ? `lp-edge-${tier}` : '';

  return (
    <>
      <BaseEdge
        path={edgePath}
        className={`react-flow__edge-path ${tierClass}`}
        style={getEdgeStyle()}
        data-testid="lp-edge"
        data-id={id}
        markerEnd={markerEnd}
      />
      
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: labelX,
              top: labelY,
            }}
          >
            <div 
              className={`lp-edge-label ${getLabelColor()}`}
              data-testid="lp-edge-label"
            >
              {displayLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { GraphEdge } from '@/types/lifePathGraph';
import { LP_VISUAL_V2 } from '@/lib/flags';

interface LifePathEdgeData {
  edge: GraphEdge;
  isHighlighted: boolean;
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

export function LifePathEdgeComponent(props: LifePathEdgeProps) {
  const {
    id, data, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd
  } = props;
  const { edge, tier, isRelatedToHovered, label, showPreviousPath } = data || {};

  // V2: Higher padding to avoid node rects
  const pad = LP_VISUAL_V2 ? 28 : 0;
  const adjustedSourceX = sourcePosition === 'right' ? sourceX + pad : sourceX - pad;
  const adjustedTargetX = targetPosition === 'left' ? targetX - pad : targetX + pad;

  // Use SmoothStep with proper coordinates
  const finalEdgePath = LP_VISUAL_V2
    ? getSmoothStepPath({
        sourceX: adjustedSourceX,
        sourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY,
        targetPosition,
        borderRadius: 12,
      })[0]
    : getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 12,
      })[0];

  const tierClass = tier ? `lp-edge-${tier}` : '';
  const dataTier = tier || '';
  const dataEdgeType = edge?.type || '';

  const baseOpacity = showPreviousPath ? 0.3 : tier === 'on-path' ? 1 : tier === 'related' ? 0.6 : 0.25;
  const hoverBoost = isRelatedToHovered ? 0.4 : 0;
  const strokeWidth = tier === 'on-path' ? 3 : tier === 'related' ? 2 : 1;

  // Use semantic tokens for stroke color
  const stroke = tier === 'on-path' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';

  const computedStyle = {
    opacity: Math.min(1, baseOpacity + hoverBoost),
    stroke,
    strokeWidth,
    fill: 'none'
  };

  return (
    <g
      className={`lp-edge ${tierClass}`}
      data-testid="lp-edge"
      data-id={id}
      data-edge-type={dataEdgeType}
    >
      <path
        className={`react-flow__edge-path ${tierClass}`.trim()}
        d={finalEdgePath}
        style={computedStyle}
        fill="none"
        markerEnd={markerEnd}
        data-id={id}
        data-testid="lp-edge-path"
        data-tier={dataTier}
        data-edge-type={dataEdgeType}
      />
      {label && (
        <foreignObject
          data-testid="lp-edge-label"
          width={120}
          height={28}
          x={(sourceX + targetX) / 2 - 60}
          y={(sourceY + targetY) / 2 - 14}
          className="pointer-events-none"
        >
          <div className={`lp-chip lp-chip--edge ${edge?.type === 'creditTransfersTo' ? 'lp-chip--transfer' : ''}`}>
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

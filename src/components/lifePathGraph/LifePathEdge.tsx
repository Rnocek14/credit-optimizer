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

  // Padding to avoid node frames for V2 routes
  const pad = 16;
  const adjSourceX = sourcePosition === 'right' ? sourceX + pad : sourcePosition === 'left' ? sourceX - pad : sourceX;
  const adjTargetX = targetPosition === 'left'  ? targetX - pad : targetPosition === 'right' ? targetX + pad : targetX;

  const [smoothPath] = getSmoothStepPath({
    sourceX: adjSourceX,
    sourceY,
    sourcePosition,
    targetX: adjTargetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const tierClass = tier ? `lp-edge-${tier}` : '';
  const baseOpacity = showPreviousPath ? 0.3 : tier === 'on-path' ? 1 : tier === 'related' ? 0.6 : 0.25;
  const hoverBoost  = isRelatedToHovered ? 0.4 : 0;
  const strokeWidth = tier === 'on-path' ? 3 : tier === 'related' ? 2 : 1;

  // Prefer semantic tokens but keep a safe fallback
  const stroke =
    tier === 'on-path'
      ? 'hsl(var(--primary))'
      : 'hsl(var(--muted-foreground))';

  return (
    <g
      className={`lp-edge ${tierClass}`}
      data-testid="lp-edge"
      data-id={id}
      data-edge-type={edge?.type || ''}
    >
      <path
        className={`react-flow__edge-path lp-edge-path ${tierClass}`}
        d={smoothPath}
        stroke={stroke}
        fill="none"
        strokeWidth={strokeWidth}
        style={{ opacity: Math.min(1, baseOpacity + hoverBoost) }}
        markerEnd={markerEnd}
        data-id={id}
        data-edge-type={edge?.type || ''}
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

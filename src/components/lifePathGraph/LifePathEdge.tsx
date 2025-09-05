import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { GraphEdge } from '@/types/lifePathGraph';
import { LP_VISUAL_V2 } from '@/lib/flags';
import { routeWithDetours, waypointsToPath, DEFAULT_LANE_OFFSETS, type Rect } from '@/lib/pathfinding/edgeRouting';

interface LifePathEdgeData {
  edge: GraphEdge;
  isHighlighted: boolean;
  tier?: 'on-path' | 'related' | 'off-path';
  isRelatedToHovered?: boolean;
  showPreviousPath?: boolean;
  label?: string;
  points?: {x: number; y: number}[];
  badge?: {text: string; tone: string};
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

  // 1) Prefer layout-computed geometry with validation
  const points = (data?.points as {x:number;y:number}[] | undefined)?.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  
  let finalEdgePath: string;
  if (points && points.length >= 2) {
    finalEdgePath = 
      points.length === 4
        ? `M ${points[0].x},${points[0].y} C ${points[1].x},${points[1].y} ${points[2].x},${points[2].y} ${points[3].x},${points[3].y}`
        : `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
  } else {
    // 2) Fallback only when layout points truly unavailable
    const [fallback] = getSmoothStepPath({ 
      sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12 
    });
    finalEdgePath = fallback;
  }

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

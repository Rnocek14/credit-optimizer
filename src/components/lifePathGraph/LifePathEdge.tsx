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

  // V2: Advanced routing with detours to avoid node collisions
  const pad = LP_VISUAL_V2 ? 28 : 0;
  const adjustedSourceX = sourcePosition === 'right' ? sourceX + pad : sourceX - pad;
  const adjustedTargetX = targetPosition === 'left' ? targetX - pad : targetX + pad;

  // Get obstacle nodes for collision detection
  const getObstacles = (): Rect[] => {
    if (!LP_VISUAL_V2) return [];
    
    const nodes = Array.from(document.querySelectorAll('.react-flow__node[data-id]'));
    return nodes.map(el => {
      const rect = el.getBoundingClientRect();
      const container = document.querySelector('.react-flow__viewport');
      const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 };
      
      return {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
        id: el.getAttribute('data-id') || ''
      };
    });
  };

  // Route with detours if V2 enabled
  const finalEdgePath = LP_VISUAL_V2 ? (() => {
    const obstacles = getObstacles();
    const source = { x: adjustedSourceX, y: sourceY };
    const target = { x: adjustedTargetX, y: targetY };
    
    const waypoints = routeWithDetours(source, target, {
      sourcePos: sourcePosition,
      targetPos: targetPosition,
      obstacles,
      padding: pad,
      laneOffsets: DEFAULT_LANE_OFFSETS
    });
    
    // If we have waypoints, create a polyline path
    if (waypoints.length > 2) {
      return waypointsToPath(waypoints);
    }
    
    // Fallback to SmoothStep
    return getSmoothStepPath({
      sourceX: adjustedSourceX,
      sourceY,
      sourcePosition,
      targetX: adjustedTargetX,
      targetY,
      targetPosition,
      borderRadius: 12,
    })[0];
  })() : getSmoothStepPath({
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
          x={(adjustedSourceX + adjustedTargetX) / 2 - 60}
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

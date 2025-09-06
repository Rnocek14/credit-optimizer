// Simplified V3-aware Edge Component — uses layout-computed points when present.
import React from 'react';
import { BaseEdge } from '@xyflow/react';
import { GraphEdge } from '@/types/lifePathGraph';

interface LifePathEdgeData {
  edge?: GraphEdge;
  isHighlighted?: boolean;
  tier?: 'on-path' | 'related' | 'off-path';
  isRelatedToHovered?: boolean;
  label?: string;
  points?: { x: number; y: number }[];
  badge?: { text: string; tone: string };
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
  const { id, data, sourceX, sourceY, targetX, targetY, markerEnd } = props;
  const { edge, tier, isRelatedToHovered, label } = data || {};

  // Prefer layout-computed geometry
  const points = (data?.points || []).filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );

  let d: string;
  if (points.length >= 2) {
    d =
      points.length === 4
        ? `M ${points[0].x},${points[0].y} C ${points[1].x},${points[1].y} ${points[2].x},${points[2].y} ${points[3].x},${points[3].y}`
        : `M ${points[0].x},${points[0].y} ` +
          points.slice(1).map((p) => `L ${p.x},${p.y}`).join(' ');
  } else {
    if (import.meta.env.DEV) console.debug('[EDGE] fallback path (no layout points)', { id });
    d = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  }

  const style = {
    opacity: tier === 'off-path' ? 0.3 : isRelatedToHovered ? 0.6 : 1,
    stroke:
      tier === 'on-path'
        ? 'hsl(var(--primary))'
        : tier === 'related'
        ? 'hsl(var(--secondary))'
        : 'hsl(var(--muted-foreground))',
    strokeWidth: tier === 'on-path' ? 3 : tier === 'related' ? 2 : 1,
    strokeDasharray: edge?.type === 'creditTransfersTo' ? '6 6' : undefined,
  } as React.CSSProperties;

  const tierClass = tier ? `lp-edge-${tier}` : '';
  const dataTier = tier || '';
  const dataEdgeType = edge?.type || '';

  return (
    <g
      className={`lp-edge ${tierClass}`}
      data-testid="lp-edge"
      data-id={id}
      data-edge-type={dataEdgeType}
      style={{ pointerEvents: 'none' }}
    >
      <path
        id={id}
        d={d}
        fill="none"
        className={`react-flow__edge-path ${tierClass}`.trim()}
        style={style}
        markerEnd={markerEnd}
        data-id={id}
        data-testid="lp-edge-path"
        data-tier={dataTier}
        data-edge-type={dataEdgeType}
      />
      {label && (
        <foreignObject
          data-testid="lp-edge-label"
          width={140}
          height={28}
          x={(sourceX + targetX) / 2 - 70}
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
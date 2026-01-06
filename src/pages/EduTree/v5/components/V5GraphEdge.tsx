import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export interface V5GraphEdgeData extends Record<string, unknown> {
  type: 'prereq' | 'timeline';
  isHighlighted?: boolean;
}

export function V5GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as V5GraphEdgeData | undefined;
  const { type = 'prereq', isHighlighted = false } = edgeData || {};

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getEdgeStyle = () => {
    const baseStyle: React.CSSProperties = {
      strokeWidth: isHighlighted ? 3 : 2,
      stroke: isHighlighted 
        ? 'var(--primary)' 
        : 'var(--muted-foreground)',
      opacity: isHighlighted ? 1 : 0.6,
    };

    if (type === 'timeline') {
      baseStyle.strokeDasharray = '5,5';
      baseStyle.opacity = 0.4;
    }

    return baseStyle;
  };

  return (
    <g className="v5-graph-edge">
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={getEdgeStyle()}
      />
    </g>
  );
}

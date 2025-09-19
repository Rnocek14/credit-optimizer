import React from 'react';
import { BaseEdge, getBezierPath, type EdgeProps, Position } from '@xyflow/react';

const GateBranchEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  // Calculate the Bezier path with gentle control points for a soft "S" curve
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition || Position.Right,
    targetPosition: targetPosition || Position.Left,
    curvature: 0.25, // Keeps it calm and professional-looking
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        strokeWidth: 4,
        stroke: 'rgba(255,255,255,0.85)',
        strokeLinecap: 'round',
        // Subtle drop shadow for visual separation from grid
        filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.35))',
        ...style,
      }}
      markerEnd={markerEnd}
    />
  );
};

export default GateBranchEdge;
import React from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

const GateEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  // Force the edge to start from the right edge of the gate node
  // Offset the sourceX by the gate node width (approximately 110px from center)
  const adjustedSourceX = sourceX + 110;
  
  const [edgePath] = getStraightPath({
    sourceX: adjustedSourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={style}
      markerEnd={markerEnd}
    />
  );
};

export default GateEdge;
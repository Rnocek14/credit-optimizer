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
  data,
}: EdgeProps) => {
  // Conditionally apply offset based on edge data
  // Gate-to-header edges use center positioning, others use right edge
  const adjustedSourceX = data?.useCenterPosition ? sourceX : sourceX + 110;
  
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
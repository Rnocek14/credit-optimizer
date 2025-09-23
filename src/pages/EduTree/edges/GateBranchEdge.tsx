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
  
  // GPT's recommended one-bend routing: horizontal segment then vertical
  // Creates clean, readable paths even with larger track spreading
  const horizontalSegment = 32; // Short horizontal segment from gate
  const bendX = sourceX + horizontalSegment;
  
  // Create one-bend path: horizontal from source, then vertical to target
  const edgePath = `M ${sourceX},${sourceY} L ${bendX},${sourceY} L ${bendX},${targetY} L ${targetX},${targetY}`;

  // Determine branch direction for styling
  const isUpBranch = targetY < sourceY;
  const branchColor = isUpBranch ? 'rgba(var(--primary), 0.85)' : 'rgba(var(--secondary), 0.85)';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        strokeWidth: 3,
        stroke: branchColor,
        strokeLinecap: 'round',
        strokeLinejoin: 'round', // Smooth corners at bends
        // Enhanced shadow for the one-bend style
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
        ...style,
      }}
      markerEnd={markerEnd}
    />
  );
};

export default GateBranchEdge;
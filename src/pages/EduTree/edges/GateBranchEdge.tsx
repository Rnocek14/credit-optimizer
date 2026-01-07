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
  
  // One-bend routing: horizontal segment then vertical for clean, readable paths
  // Works perfectly with larger track spreading for symmetric appearance
  const horizontalSegment = 24; // Shorter horizontal segment from gate (grid-snapped)
  const bendX = sourceX + horizontalSegment;
  
  // Create one-bend path: horizontal from source, then vertical to target
  const edgePath = `M ${sourceX},${sourceY} L ${bendX},${sourceY} L ${bendX},${targetY} L ${targetX},${targetY}`;

  // Determine branch direction for semantic styling  
  const isUpBranch = targetY < sourceY;
  const branchColor = isUpBranch ? 'var(--primary)' : 'var(--secondary)';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        strokeWidth: 2.5,  // Slightly thinner for elegance
        stroke: branchColor,
        strokeLinecap: 'round',
        strokeLinejoin: 'round', // Smooth corners at bends
        opacity: 0.9,
        // Enhanced shadow for the one-bend style
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
        ...style,
      }}
      markerEnd={markerEnd}
    />
  );
};

export default GateBranchEdge;
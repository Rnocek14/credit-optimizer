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
  
  // Calculate symmetric manual control points for perfect mirroring
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  
  // Shared horizontal control point - both branches bend at same X
  const controlX = sourceX + (dx * 0.6);
  
  // Create symmetric vertical offsets
  const isUpBranch = dy < 0;
  const verticalOffset = Math.abs(dy) * 0.3; // Gentle vertical curve
  
  // Manual Bezier curve with symmetric control points
  const cp1X = controlX;
  const cp1Y = sourceY + (isUpBranch ? -verticalOffset : verticalOffset) * 0.3;
  const cp2X = controlX;  
  const cp2Y = targetY + (isUpBranch ? verticalOffset : -verticalOffset) * 0.3;
  
  // Create SVG path with manual control points for perfect symmetry
  const edgePath = `M ${sourceX},${sourceY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${targetX},${targetY}`;

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
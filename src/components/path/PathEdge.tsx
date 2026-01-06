import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

interface PathEdgeData {
  label?: string;
  animated?: boolean;
  edgeType?: 'prerequisite' | 'sequence' | 'suggested' | 'alternative' | 'branch';
}

/**
 * PathEdge component for React Flow
 * Note: CSS variables contain full OKLCH values, so use var() directly (not hsl())
 */
const PathEdge = ({
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as PathEdgeData | undefined;
  const edgeType = edgeData?.edgeType || 'sequence';

  // Define edge styles based on type
  const getEdgeStyle = () => {
    const baseStyle = {
      strokeWidth: 2,
      ...style,
    };

    switch (edgeType) {
      case 'prerequisite':
        return {
          ...baseStyle,
          stroke: 'var(--destructive)',
          strokeDasharray: 'none',
        };
      case 'suggested':
        return {
          ...baseStyle,
          stroke: 'var(--primary)',
          strokeDasharray: '8 4',
        };
      case 'alternative':
        return {
          ...baseStyle,
          stroke: 'var(--muted-foreground)',
          strokeDasharray: '4 4',
        };
      case 'branch':
        return {
          ...baseStyle,
          stroke: 'var(--accent-foreground)',
          strokeDasharray: 'none',
        };
      case 'sequence':
      default:
        return {
          ...baseStyle,
          stroke: 'var(--border)',
          strokeDasharray: 'none',
        };
    }
  };

  const edgeStyle = getEdgeStyle();

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={edgeStyle}
        className={edgeData?.animated ? 'animate-pulse' : ''}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute bg-background border rounded px-2 py-1 text-xs font-medium shadow-sm pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default PathEdge;

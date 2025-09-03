import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { GraphEdge } from '@/types/lifePathGraph';
import { Badge } from '@/components/ui/badge';

interface LifePathEdgeData {
  edge: GraphEdge;
  isHighlighted: boolean;
  pathType?: string;
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

export function LifePathEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: LifePathEdgeProps) {
  const { edge, isHighlighted } = data;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getEdgeStyle = () => {
    const baseStyle = {
      strokeWidth: isHighlighted ? 3 : 1.5,
    };

    switch (edge.type) {
      case 'requires':
        return { ...baseStyle, stroke: '#3b82f6' }; // blue
      case 'enables':
        return { ...baseStyle, stroke: '#10b981' }; // green
      case 'substitutes':
        return { ...baseStyle, stroke: '#f59e0b', strokeDasharray: '8,4' }; // amber, dashed
      case 'creditTransfersTo':
        return { ...baseStyle, stroke: '#8b5cf6' }; // purple
      case 'ghost':
        return { ...baseStyle, stroke: '#ef4444', strokeDasharray: '4,4', opacity: 0.6 }; // red, dotted
      case 'alternative':
        return { ...baseStyle, stroke: '#6b7280', strokeDasharray: '6,3' }; // gray, dashed
      default:
        return { ...baseStyle, stroke: '#6b7280' }; // gray
    }
  };

  const getEdgeLabel = () => {
    switch (edge.type) {
      case 'substitutes':
        return 'Alt';
      case 'creditTransfersTo':
        return `${Math.round((edge.creditTransferRate || 1) * 100)}%`;
      case 'ghost':
        return 'Ghost';
      default:
        return null;
    }
  };

  const getLabelColor = () => {
    switch (edge.type) {
      case 'substitutes':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
      case 'creditTransfersTo':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200';
      case 'ghost':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200';
    }
  };

  const label = getEdgeLabel();

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={getEdgeStyle()} 
      />
      
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: labelX,
              top: labelY,
            }}
          >
            <Badge 
              variant="outline" 
              className={`text-xs px-1.5 py-0.5 border-0 ${getLabelColor()}`}
            >
              {label}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
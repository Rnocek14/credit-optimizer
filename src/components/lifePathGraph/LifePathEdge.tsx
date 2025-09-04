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
        // Fixed transfer rate calculation: Math.round(creditTransferRate * 100)
        const transferRate = edge.creditTransferRate || 0.85; // Default 85% transfer rate
        return `${Math.round(transferRate * 100)}% transfer`;
      case 'ghost':
        return 'Ghost';
      case 'equivalentTo':
        return 'Equivalent';
      case 'buildsSkill':
        return 'Builds';
      default:
        return null;
    }
  };

  const getLabelColor = () => {
    switch (edge.type) {
      case 'substitutes':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200';
      case 'creditTransfersTo':
        const transferRate = edge.creditTransferRate || (1 - (edge.weights.creditLoss / (edge.weights.creditLoss + 3))) || 1;
        if (transferRate === 1) {
          return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200';
        } else if (transferRate >= 0.8) {
          return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200';
        } else {
          return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200';
        }
      case 'ghost':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200';
      case 'equivalentTo':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200';
      case 'buildsSkill':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-200';
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
              className={`text-xs px-2 py-1 border font-medium shadow-sm ${getLabelColor()}`}
            >
              {label}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
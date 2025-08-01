import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { SemanticEdge as SemanticEdgeType } from '@/types/semantic';

interface SemanticEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  data?: {
    edge: SemanticEdgeType;
    showLabels?: boolean;
  };
}

export const SemanticEdge: React.FC<SemanticEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edge = data?.edge;
  const showLabels = data?.showLabels || false;

  const getEdgeStyle = () => {
    if (!edge) return { stroke: '#94a3b8', strokeWidth: 2 };

    const baseStyle = { strokeWidth: 2 };

    switch (edge.type) {
      case 'prerequisite':
        return {
          ...baseStyle,
          stroke: '#3b82f6', // blue
          strokeDasharray: '0',
          strokeWidth: 2,
        };
      case 'leads_to':
        return {
          ...baseStyle,
          stroke: '#10b981', // green
          strokeDasharray: '0',
          strokeWidth: 2,
        };
      case 'alternative':
        return {
          ...baseStyle,
          stroke: '#f59e0b', // amber
          strokeDasharray: '5,5',
          strokeWidth: 2,
        };
      case 'pivot':
        return {
          ...baseStyle,
          stroke: '#8b5cf6', // violet
          strokeDasharray: '10,5',
          strokeWidth: 3,
        };
      case 'substitution':
        return {
          ...baseStyle,
          stroke: '#06b6d4', // cyan
          strokeDasharray: '3,3',
          strokeWidth: 2,
        };
      default:
        return {
          ...baseStyle,
          stroke: '#94a3b8', // gray
        };
    }
  };

  const getMarkerEnd = () => {
    if (!edge) return MarkerType.ArrowClosed;
    return MarkerType.ArrowClosed;
  };

  const getConfidenceLevel = () => {
    if (!edge?.metadata?.confidence) return null;
    const confidence = edge.metadata.confidence;
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Med';
    return 'Low';
  };

  const getStrengthLevel = () => {
    if (!edge?.metadata?.strength) return null;
    const strength = edge.metadata.strength;
    if (strength > 0.8) return 'Strong';
    if (strength > 0.6) return 'Moderate';
    return 'Weak';
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={getMarkerEnd()}
        style={getEdgeStyle()}
      />
      
      {showLabels && edge && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {/* Edge type badge */}
              <Badge
                variant="secondary"
                className="text-xs bg-background/90 backdrop-blur border"
              >
                {edge.type.replace('_', ' ')}
              </Badge>

              {/* Metadata badges */}
              <div className="flex gap-1">
                {getConfidenceLevel() && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-background/90 backdrop-blur"
                  >
                    {getConfidenceLevel()}
                  </Badge>
                )}
                
                {getStrengthLevel() && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-background/90 backdrop-blur"
                  >
                    {getStrengthLevel()}
                  </Badge>
                )}

                {edge.metadata?.skill_overlap && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-background/90 backdrop-blur"
                  >
                    {Math.round(edge.metadata.skill_overlap * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
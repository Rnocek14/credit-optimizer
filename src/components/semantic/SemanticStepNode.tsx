import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Clock, Zap, ArrowRight } from 'lucide-react';
import { SemanticNode } from '@/types/semantic';

interface SemanticStepNodeProps {
  data: {
    node: SemanticNode;
    isSelected?: boolean;
    isCompleted?: boolean;
    isInProgress?: boolean;
    onNodeAction?: (action: string, nodeId: string) => void;
  };
}

export const SemanticStepNode: React.FC<SemanticStepNodeProps> = ({ data }) => {
  const { node, isSelected, isCompleted, isInProgress, onNodeAction } = data;

  const getNodeBorderColor = () => {
    if (isCompleted) return 'border-success';
    if (isInProgress) return 'border-warning';
    if (isSelected) return 'border-primary';
    return 'border-border';
  };

  const getNodeBackgroundColor = () => {
    if (isCompleted) return 'bg-success/5';
    if (isInProgress) return 'bg-warning/5';
    return 'bg-card';
  };

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-4 h-4 text-success" />;
    if (isInProgress) return <Clock className="w-4 h-4 text-warning" />;
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  const getDurationDisplay = () => {
    const weeks = node.metadata.duration_weeks || 0;
    if (weeks < 1) return 'Quick task';
    if (weeks === 1) return '1 week';
    return `${weeks} weeks`;
  };

  return (
    <Card className={`p-3 min-w-[160px] max-w-[200px] ${getNodeBackgroundColor()} border-2 ${getNodeBorderColor()} hover:shadow-sm transition-all duration-200`}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />

      {/* Status and title */}
      <div className="flex items-start gap-2 mb-2">
        {getStatusIcon()}
        <div className="flex-1">
          <h4 className="font-medium text-sm leading-tight">
            {node.title}
          </h4>
          {node.metadata.category && (
            <Badge variant="outline" className="text-xs mt-1">
              {node.metadata.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{getDurationDisplay()}</span>
          {node.metadata.xp_value && (
            <span>{node.metadata.xp_value} XP</span>
          )}
        </div>

        {node.metadata.difficulty && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Difficulty:</span>
            <Badge 
              variant={node.metadata.difficulty > 7 ? "destructive" : node.metadata.difficulty > 4 ? "default" : "secondary"} 
              className="text-xs"
            >
              {node.metadata.difficulty}/10
            </Badge>
          </div>
        )}
      </div>

      {/* Personalization indicators */}
      {node.metadata.personalization_score && node.metadata.personalization_score > 0.7 && (
        <div className="flex items-center gap-1 mb-2 text-xs text-success">
          <Zap className="w-3 h-3" />
          <span>Optimized for you</span>
        </div>
      )}

      {/* Adaptations display */}
      {node.adaptations && node.adaptations.length > 0 && (
        <div className="mb-2">
          {node.adaptations.map((adaptation, index) => (
            <div key={index} className="text-xs text-warning bg-warning/10 rounded px-2 py-1 mb-1">
              {adaptation.type}: {adaptation.reasoning}
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      {!isCompleted && (
        <Button
          size="sm"
          variant={isInProgress ? "default" : "outline"}
          className="text-xs w-full"
          onClick={() => onNodeAction?.(isInProgress ? 'continue' : 'start', node.id)}
        >
          {isInProgress ? (
            <>
              <Clock className="w-3 h-3 mr-1" />
              Continue
            </>
          ) : (
            <>
              <ArrowRight className="w-3 h-3 mr-1" />
              Start Step
            </>
          )}
        </Button>
      )}

      {/* Completion indicator */}
      {isCompleted && (
        <div className="text-xs text-success text-center font-medium">
          ✓ Completed
        </div>
      )}
    </Card>
  );
};
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Target, BookOpen } from 'lucide-react';

interface PivotStepNodeData {
  title: string;
  description?: string;
  skills_needed?: string[];
  skills_already_have?: string[];
  estimated_time?: string;
  estimated_cost?: string;
  learning_resources?: Array<{
    title: string;
    provider: string;
    cost: string;
    duration: string;
    reasoning: string;
  }>;
  pivotSource: string;
  isStart?: boolean;
  isGoal?: boolean;
  stepIndex: number;
  totalSteps: number;
}

const PivotStepNode = memo(({ data }: { data: PivotStepNodeData }) => {
  const { 
    title, 
    description, 
    skills_needed = [], 
    skills_already_have = [],
    estimated_time, 
    estimated_cost,
    learning_resources = [],
    pivotSource,
    isStart,
    isGoal,
    stepIndex,
    totalSteps
  } = data;

  const getNodeVariant = () => {
    if (isStart) return 'bg-green-50 border-green-300 text-green-900';
    if (isGoal) return 'bg-purple-50 border-purple-300 text-purple-900';
    return 'bg-blue-50 border-blue-300 text-blue-900';
  };

  const getIconColor = () => {
    if (isStart) return 'text-green-600';
    if (isGoal) return 'text-purple-600';
    return 'text-blue-600';
  };

  return (
    <div className={`relative min-w-[280px] max-w-[320px] rounded-lg border-2 p-4 shadow-sm ${getNodeVariant()}`}>
      {/* Connection Handles */}
      {!isStart && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 border-2 border-background"
        />
      )}
      {!isGoal && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 border-2 border-background"
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isStart && <Target className={`w-4 h-4 ${getIconColor()}`} />}
            {isGoal && <BookOpen className={`w-4 h-4 ${getIconColor()}`} />}
            <Badge variant="outline" className="text-xs">
              Step {stepIndex} of {totalSteps}
            </Badge>
          </div>
          <h3 className="font-semibold text-sm leading-tight">{title}</h3>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {description}
        </p>
      )}

      {/* Time and Cost */}
      <div className="flex items-center gap-3 mb-3">
        {estimated_time && (
          <div className="flex items-center gap-1">
            <Clock className={`w-3 h-3 ${getIconColor()}`} />
            <span className="text-xs font-medium">{estimated_time}</span>
          </div>
        )}
        {estimated_cost && (
          <div className="flex items-center gap-1">
            <DollarSign className={`w-3 h-3 ${getIconColor()}`} />
            <span className="text-xs font-medium">{estimated_cost}</span>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="space-y-2">
        {skills_needed.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Skills needed:</p>
            <div className="flex flex-wrap gap-1">
              {skills_needed.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                  {skill}
                </Badge>
              ))}
              {skills_needed.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{skills_needed.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {skills_already_have.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Already have:</p>
            <div className="flex flex-wrap gap-1">
              {skills_already_have.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-0 border-green-300 text-green-700">
                  {skill}
                </Badge>
              ))}
              {skills_already_have.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0 border-green-300 text-green-700">
                  +{skills_already_have.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Learning Resources */}
      {learning_resources.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border/50">
          <p className="text-xs font-medium mb-1">Resources:</p>
          <div className="space-y-1">
            {learning_resources.slice(0, 2).map((resource, index) => (
              <div key={index} className="text-xs">
                <span className="font-medium">{resource.title}</span>
                <span className="text-muted-foreground"> by {resource.provider}</span>
              </div>
            ))}
            {learning_resources.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{learning_resources.length - 2} more resources
              </p>
            )}
          </div>
        </div>
      )}

      {/* Career Source Badge */}
      <div className="absolute -top-2 -right-2">
        <Badge className="text-xs px-2 py-1 bg-background border shadow-sm">
          {pivotSource}
        </Badge>
      </div>
    </div>
  );
});

PivotStepNode.displayName = 'PivotStepNode';

export default PivotStepNode;
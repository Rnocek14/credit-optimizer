import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, Clock, DollarSign, Play, Star, ExternalLink } from 'lucide-react';
import { SemanticNode, SubstitutionOption } from '@/types/semantic';
import { SubstitutionOverlay } from './SubstitutionOverlay';

interface SemanticCourseNodeProps {
  data: {
    node: SemanticNode;
    isSelected?: boolean;
    onSubstitutionSelect?: (substitution: SubstitutionOption) => void;
    onNodeAction?: (action: string, nodeId: string) => void;
  };
}

export const SemanticCourseNode: React.FC<SemanticCourseNodeProps> = ({ data }) => {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { node, isSelected, onSubstitutionSelect, onNodeAction } = data;

  const getNodeBorderColor = () => {
    if (isSelected) return 'border-primary';
    if (node.metadata.personalization_score && node.metadata.personalization_score > 0.8) {
      return 'border-success';
    }
    if (node.substitutions && node.substitutions.length > 0) {
      return 'border-info';
    }
    return 'border-border';
  };

  const getDifficultyBadgeVariant = () => {
    const difficulty = node.metadata.difficulty || 0;
    if (difficulty > 7) return 'destructive';
    if (difficulty > 4) return 'default';
    return 'secondary';
  };

  const getCostDisplay = () => {
    const cost = node.metadata.cost || 0;
    if (cost === 0) return 'Free';
    if (cost < 50) return `$${cost}`;
    return `$${cost}`;
  };

  const getDurationDisplay = () => {
    const weeks = node.metadata.duration_weeks || 0;
    if (weeks < 1) return 'Self-paced';
    if (weeks === 1) return '1 week';
    return `${weeks} weeks`;
  };

  const hasAlternatives = node.substitutions && node.substitutions.length > 0;

  return (
    <TooltipProvider>
      <div className="relative">
        <Card className={`p-3 min-w-[180px] max-w-[220px] bg-card border-2 ${getNodeBorderColor()} hover:shadow-md transition-all duration-200`}>
          {/* Handles */}
          <Handle type="target" position={Position.Left} className="w-3 h-3" />
          <Handle type="source" position={Position.Right} className="w-3 h-3" />

          {/* Course icon and header */}
          <div className="flex items-start gap-2 mb-3">
            <div className="p-1.5 rounded bg-info/10">
              <BookOpen className="w-4 h-4 text-info" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm leading-tight">
                {node.title}
              </h4>
              {node.metadata.confidence_score && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-warning fill-current" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((node.metadata.confidence_score || 0) * 100)}% match
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Course metadata */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{getDurationDisplay()}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>{getCostDisplay()}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {node.metadata.difficulty && (
                <Badge variant={getDifficultyBadgeVariant()} className="text-xs">
                  Level {node.metadata.difficulty}
                </Badge>
              )}
              
              {node.metadata.category && (
                <Badge variant="outline" className="text-xs">
                  {node.metadata.category}
                </Badge>
              )}

              {node.metadata.xp_value && (
                <Badge variant="secondary" className="text-xs">
                  {node.metadata.xp_value} XP
                </Badge>
              )}
            </div>
          </div>

          {/* Personalization indicators */}
          {node.metadata.personalization_score && node.metadata.personalization_score > 0.7 && (
            <div className="flex items-center gap-1 mb-2 text-xs text-success">
              <Star className="w-3 h-3 fill-current" />
              <span>Recommended for you</span>
            </div>
          )}

          {/* Adaptations */}
          {node.adaptations && node.adaptations.length > 0 && (
            <div className="mb-2 p-2 rounded bg-warning/10 border border-warning/20">
              <p className="text-xs text-warning font-medium">
                Adapted for your needs
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              className="text-xs flex-1"
              onClick={() => onNodeAction?.('start-course', node.id)}
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
            
            {hasAlternatives && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setShowAlternatives(!showAlternatives)}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </Card>

        {/* Alternatives overlay */}
        {showAlternatives && hasAlternatives && (
          <SubstitutionOverlay
            substitutions={node.substitutions!}
            onSelect={onSubstitutionSelect}
            onClose={() => setShowAlternatives(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
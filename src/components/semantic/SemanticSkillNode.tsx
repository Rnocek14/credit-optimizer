import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Zap, Star, MapPin } from 'lucide-react';
import { SemanticNode, SubstitutionOption } from '@/types/semantic';
import { SubstitutionOverlay } from './SubstitutionOverlay';

interface SemanticSkillNodeProps {
  data: {
    node: SemanticNode;
    isSelected?: boolean;
    onSubstitutionSelect?: (substitution: SubstitutionOption) => void;
    onNodeAction?: (action: string, nodeId: string) => void;
  };
}

export const SemanticSkillNode: React.FC<SemanticSkillNodeProps> = ({ data }) => {
  const [showSubstitutions, setShowSubstitutions] = useState(false);
  const { node, isSelected, onSubstitutionSelect, onNodeAction } = data;

  const getNodeBorderColor = () => {
    if (isSelected) return 'border-primary';
    if (node.metadata.personalization_score && node.metadata.personalization_score > 0.8) {
      return 'border-success';
    }
    if (node.substitutions && node.substitutions.length > 0) {
      return 'border-warning';
    }
    return 'border-border';
  };

  const getConfidenceColor = () => {
    const score = node.metadata.confidence_score || 0;
    if (score > 0.8) return 'text-success';
    if (score > 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const hasAdaptations = node.adaptations && node.adaptations.length > 0;
  const hasSubstitutions = node.substitutions && node.substitutions.length > 0;

  return (
    <TooltipProvider>
      <div className="relative">
        <Card className={`p-3 min-w-[180px] max-w-[220px] bg-card border-2 ${getNodeBorderColor()} hover:shadow-md transition-all duration-200`}>
          {/* Handles */}
          <Handle type="target" position={Position.Left} className="w-3 h-3" />
          <Handle type="source" position={Position.Right} className="w-3 h-3" />

          {/* Header with title and confidence */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm leading-tight flex-1 pr-2">
              {node.title}
            </h4>
            {node.metadata.confidence_score && (
              <Tooltip>
                <TooltipTrigger>
                  <div className={`text-xs font-bold ${getConfidenceColor()}`}>
                    {Math.round((node.metadata.confidence_score || 0) * 100)}%
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Confidence Score: {Math.round((node.metadata.confidence_score || 0) * 100)}%
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {node.metadata.category && (
              <Badge variant="secondary" className="text-xs">
                {node.metadata.category}
              </Badge>
            )}
            
            {node.metadata.xp_value && (
              <Badge variant="outline" className="text-xs">
                {node.metadata.xp_value} XP
              </Badge>
            )}

            {node.metadata.difficulty && (
              <Badge variant={node.metadata.difficulty > 7 ? "destructive" : node.metadata.difficulty > 4 ? "default" : "secondary"} className="text-xs">
                L{node.metadata.difficulty}
              </Badge>
            )}
          </div>

          {/* Personalization indicators */}
          {node.metadata.personalization_score && node.metadata.personalization_score > 0.7 && (
            <div className="flex items-center gap-1 mb-2 text-xs text-success">
              <Star className="w-3 h-3" />
              <span>Highly Recommended</span>
            </div>
          )}

          {hasAdaptations && (
            <div className="flex items-center gap-1 mb-2 text-xs text-warning">
              <Zap className="w-3 h-3" />
              <span>Adapted for you</span>
            </div>
          )}

          {node.metadata.location_relevance && node.metadata.location_relevance > 0.8 && (
            <div className="flex items-center gap-1 mb-2 text-xs text-info">
              <MapPin className="w-3 h-3" />
              <span>Location match</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1 mt-2">
            {hasSubstitutions && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => setShowSubstitutions(!showSubstitutions)}
              >
                Alternatives
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => onNodeAction?.('start-learning', node.id)}
            >
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        {/* Substitution overlay */}
        {showSubstitutions && hasSubstitutions && (
          <SubstitutionOverlay
            substitutions={node.substitutions!}
            onSelect={onSubstitutionSelect}
            onClose={() => setShowSubstitutions(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
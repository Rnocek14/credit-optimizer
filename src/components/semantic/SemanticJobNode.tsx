import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Briefcase, TrendingUp, MapPin, DollarSign, Users } from 'lucide-react';
import { SemanticNode, PivotOpportunity } from '@/types/semantic';
import { PivotIntelligencePanel } from './PivotIntelligencePanel';

interface SemanticJobNodeProps {
  data: {
    node: SemanticNode;
    isSelected?: boolean;
    pivotOpportunities?: PivotOpportunity[];
    onPivotSelect?: (pivot: PivotOpportunity) => void;
    onNodeAction?: (action: string, nodeId: string) => void;
  };
}

export const SemanticJobNode: React.FC<SemanticJobNodeProps> = ({ data }) => {
  const [showPivots, setShowPivots] = useState(false);
  const { node, isSelected, pivotOpportunities, onPivotSelect, onNodeAction } = data;

  const getNodeBorderColor = () => {
    if (isSelected) return 'border-primary';
    if (node.metadata.personalization_score && node.metadata.personalization_score > 0.8) {
      return 'border-success';
    }
    if (pivotOpportunities && pivotOpportunities.length > 0) {
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

  const getSalaryRange = () => {
    // Mock salary data - in real app, this would come from the node metadata
    if (node.title.toLowerCase().includes('senior')) return '$80k - $120k';
    if (node.title.toLowerCase().includes('lead') || node.title.toLowerCase().includes('manager')) return '$100k - $150k';
    return '$60k - $90k';
  };

  const hasPivots = pivotOpportunities && pivotOpportunities.length > 0;

  return (
    <TooltipProvider>
      <div className="relative">
        <Card className={`p-4 min-w-[200px] max-w-[250px] bg-card border-2 ${getNodeBorderColor()} hover:shadow-lg transition-all duration-200`}>
          {/* Handles */}
          <Handle type="target" position={Position.Left} className="w-3 h-3" />
          <Handle type="source" position={Position.Right} className="w-3 h-3" />

          {/* Job icon and header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm leading-tight">
                {node.title}
              </h4>
              {node.metadata.confidence_score && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`text-xs font-bold ${getConfidenceColor()} mt-1`}>
                      Match: {Math.round((node.metadata.confidence_score || 0) * 100)}%
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Career fit confidence based on your skills and preferences
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Job details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span>{getSalaryRange()}</span>
            </div>
            
            {node.metadata.location_relevance && node.metadata.location_relevance > 0.6 && (
              <div className="flex items-center gap-2 text-xs text-success">
                <MapPin className="w-3 h-3" />
                <span>Available in your area</span>
              </div>
            )}

            {node.metadata.category && (
              <Badge variant="secondary" className="text-xs">
                {node.metadata.category}
              </Badge>
            )}
          </div>

          {/* Personalization indicators */}
          {node.metadata.personalization_score && node.metadata.personalization_score > 0.7 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-success/10 border border-success/20">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-success font-medium">
                Strong career match
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {hasPivots && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => setShowPivots(!showPivots)}
              >
                <Users className="w-3 h-3 mr-1" />
                Pivot Options
              </Button>
            )}
            
            <Button
              size="sm"
              variant="default"
              className="text-xs"
              onClick={() => onNodeAction?.('set-goal', node.id)}
            >
              Set Goal
            </Button>
          </div>
        </Card>

        {/* Pivot intelligence panel */}
        {showPivots && hasPivots && (
          <PivotIntelligencePanel
            pivots={pivotOpportunities!}
            currentJobId={node.id}
            onSelect={onPivotSelect}
            onClose={() => setShowPivots(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
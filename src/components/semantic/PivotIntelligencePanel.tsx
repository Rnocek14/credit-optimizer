import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, TrendingUp, Clock, DollarSign, Target } from 'lucide-react';
import { PivotOpportunity } from '@/types/semantic';

interface PivotIntelligencePanelProps {
  pivots: PivotOpportunity[];
  currentJobId: string;
  onSelect?: (pivot: PivotOpportunity) => void;
  onClose: () => void;
}

export const PivotIntelligencePanel: React.FC<PivotIntelligencePanelProps> = ({
  pivots,
  currentJobId,
  onSelect,
  onClose
}) => {
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 0.3) return 'text-success';
    if (difficulty < 0.7) return 'text-warning';
    return 'text-destructive';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 0.3) return 'Easy';
    if (difficulty < 0.7) return 'Moderate';
    return 'Challenging';
  };

  const getROIColor = (roi: number) => {
    if (roi > 0.7) return 'text-success';
    if (roi > 0.4) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className="absolute top-full left-0 z-50 p-4 min-w-[350px] max-w-[450px] mt-2 bg-popover border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h5 className="font-semibold text-sm">Career Pivot Opportunities</h5>
          <p className="text-xs text-muted-foreground">Based on your current skills</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Pivot opportunities */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {pivots.map((pivot, index) => (
          <div
            key={`${pivot.to_job_id}-${index}`}
            className="p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onSelect?.(pivot)}
          >
            {/* Job title and overlap */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h6 className="font-medium text-sm mb-1">Target Role</h6>
                <p className="text-xs text-muted-foreground">Job ID: {pivot.to_job_id}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(pivot.skill_overlap_percentage)}% overlap
              </Badge>
            </div>

            {/* Skill overlap progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Skill Match</span>
                <span className="text-xs font-medium">{Math.round(pivot.skill_overlap_percentage)}%</span>
              </div>
              <Progress value={pivot.skill_overlap_percentage} className="h-2" />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className={`text-xs font-bold ${getDifficultyColor(pivot.transition_difficulty)}`}>
                  {getDifficultyLabel(pivot.transition_difficulty)}
                </div>
                <div className="text-xs text-muted-foreground">Difficulty</div>
              </div>
              
              <div className="text-center">
                <div className={`text-xs font-bold ${getROIColor(pivot.roi_score)}`}>
                  {Math.round(pivot.roi_score * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">ROI Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-bold text-foreground">
                  {pivot.estimated_timeline}
                </div>
                <div className="text-xs text-muted-foreground">Timeline</div>
              </div>
            </div>

            {/* Bridge skills */}
            {pivot.bridge_skills && pivot.bridge_skills.length > 0 && (
              <div className="mb-3">
                <h6 className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Skills to develop:
                </h6>
                <div className="flex flex-wrap gap-1">
                  {pivot.bridge_skills.slice(0, 3).map((skill, skillIndex) => (
                    <Badge key={skillIndex} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {pivot.bridge_skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{pivot.bridge_skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Quality indicators */}
            <div className="flex gap-1">
              {pivot.skill_overlap_percentage > 70 && (
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  High Match
                </Badge>
              )}
              
              {pivot.transition_difficulty < 0.3 && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Quick Transition
                </Badge>
              )}
              
              {pivot.roi_score > 0.7 && (
                <Badge variant="default" className="text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  High ROI
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {pivots.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-4">
          No pivot opportunities found
        </div>
      )}
    </Card>
  );
};
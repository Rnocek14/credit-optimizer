import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Star, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Target,
  Zap
} from 'lucide-react';

interface PivotCardProps {
  pivot: any;
  index: number;
  isSelected: boolean;
  onSelect: (pivot: any) => void;
  onViewDetails: (pivot: any) => void;
  onSelectPivot: (pivot: any) => void;
}

export const OptimizedPivotCard = memo(function OptimizedPivotCard({
  pivot,
  index,
  isSelected,
  onSelect,
  onViewDetails,
  onSelectPivot
}: PivotCardProps) {
  const confidence = Math.min(pivot.roi_score || 0, 100);
  const skillGap = pivot.missing_skills?.length || 0;
  const skillMatch = pivot.shared_skills?.length || 0;
  const totalSkills = skillGap + skillMatch || 1;
  const skillOverlap = (skillMatch / totalSkills) * 100;
  
  const getConfidenceConfig = (score: number) => {
    if (score >= 85) return { 
      level: 'Very High', 
      colorClass: 'bg-success/10 text-success border-success/20', 
      icon: '🚀' 
    };
    if (score >= 70) return { 
      level: 'High', 
      colorClass: 'bg-primary/10 text-primary border-primary/20', 
      icon: '⭐' 
    };
    if (score >= 55) return { 
      level: 'Medium', 
      colorClass: 'bg-warning/10 text-warning border-warning/20', 
      icon: '💡' 
    };
    return { 
      level: 'Low', 
      colorClass: 'bg-destructive/10 text-destructive border-destructive/20', 
      icon: '⚠️' 
    };
  };

  const confidenceConfig = getConfidenceConfig(confidence);

  return (
    <Card 
      className={`
        group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/20'}
        h-full flex flex-col min-h-[420px]
      `}
      onClick={() => onSelect(pivot)}
    >
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{confidenceConfig.icon}</span>
              <Badge variant="outline" className={confidenceConfig.colorClass}>
                {confidenceConfig.level}
              </Badge>
              {index === 0 && (
                <Badge className="bg-primary text-primary-foreground border-0">
                  <Star className="w-3 h-3 mr-1" />
                  Top Pick
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl leading-tight mb-2 group-hover:text-primary transition-colors">
              {pivot.new_career}
            </CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(pivot);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm">ROI</span>
            </div>
            <div className="font-bold text-lg text-green-600">{confidence}%</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Time</span>
            </div>
            <div className="font-bold text-sm">{pivot.estimated_time}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm">Cost</span>
            </div>
            <div className="font-bold text-sm">{pivot.estimated_cost}</div>
          </div>
        </div>

        {/* Skill Match Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Skill Match</span>
            <span className="text-sm font-bold">{Math.round(skillOverlap)}%</span>
          </div>
          <Progress value={skillOverlap} className="h-3" />
          <div className="text-xs text-muted-foreground">
            {skillMatch} existing skills, {skillGap} new skills needed
          </div>
        </div>

        {/* Skills to Develop */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Key Skills to Develop</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pivot.missing_skills?.slice(0, 4).map((skill: string, idx: number) => (
              <Badge 
                key={`skill-${skill}-${idx}`} 
                variant="secondary" 
                className="text-xs hover:bg-secondary/80 transition-colors"
              >
                {skill}
              </Badge>
            ))}
            {skillGap > 4 && (
              <Badge variant="outline" className="text-xs">
                +{skillGap - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              size="sm"
              className="hover:bg-primary/5 hover:border-primary/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(pivot);
              }}
            >
              View Details
            </Button>
            <Button 
              variant={index === 0 ? "default" : "outline"}
              size="sm"
              className={index === 0 ? "bg-primary hover:bg-primary/90" : "hover:bg-primary/5 hover:border-primary/20"}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPivot(pivot);
              }}
            >
              <Zap className="w-3 h-3 mr-1" />
              {index === 0 ? 'Compare' : 'Select'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
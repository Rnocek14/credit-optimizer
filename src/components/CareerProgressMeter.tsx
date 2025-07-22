import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, TrendingUp, CheckCircle, Circle } from 'lucide-react';

interface CareerProgressMeterProps {
  selectedCareerPath?: {
    id: string;
    title: string;
    track: string;
    level: string;
    average_salary?: number;
    roi_score?: number;
  };
  progressData: {
    completionPercentage: number;
    requiredSkillsCompleted: number;
    totalRequiredSkills: number;
    optionalSkillsCompleted: number;
    totalOptionalSkills: number;
    estimatedTimeRemaining?: string;
    currentROI?: number;
  };
  userLocation?: string;
}

const getTrackIcon = (track: string) => {
  const icons = {
    design: '🎨',
    engineering: '⚛️', 
    data: '📊',
    product: '🚀',
    marketing: '📈',
    security: '🔒',
    general: '💼'
  };
  return icons[track as keyof typeof icons] || '💼';
};

const getTrackColor = (track: string) => {
  const colors = {
    design: 'hsl(var(--chart-1))',
    engineering: 'hsl(var(--chart-2))', 
    data: 'hsl(var(--chart-3))',
    product: 'hsl(var(--chart-4))',
    marketing: 'hsl(var(--chart-5))',
    security: 'hsl(var(--destructive))',
    general: 'hsl(var(--muted-foreground))'
  };
  return colors[track as keyof typeof colors] || 'hsl(var(--muted-foreground))';
};

export const CareerProgressMeter: React.FC<CareerProgressMeterProps> = ({
  selectedCareerPath,
  progressData,
  userLocation = 'US'
}) => {
  if (!selectedCareerPath) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-2">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          </div>
          <p className="text-sm text-muted-foreground">
            Select a career goal to track your progress
          </p>
        </CardContent>
      </Card>
    );
  }

  const trackColor = getTrackColor(selectedCareerPath.track);
  const trackIcon = getTrackIcon(selectedCareerPath.track);
  const readinessLevel = progressData.completionPercentage >= 80 ? 'Ready' : 
                        progressData.completionPercentage >= 60 ? 'Almost Ready' :
                        progressData.completionPercentage >= 40 ? 'In Progress' : 'Getting Started';
  
  const readinessColor = progressData.completionPercentage >= 80 ? 'text-green-600' : 
                        progressData.completionPercentage >= 60 ? 'text-yellow-600' :
                        progressData.completionPercentage >= 40 ? 'text-blue-600' : 'text-muted-foreground';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-xl">{trackIcon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {selectedCareerPath.title}
              <Badge 
                variant="outline" 
                className="capitalize text-xs"
                style={{ borderColor: trackColor, color: trackColor }}
              >
                {selectedCareerPath.level}
              </Badge>
            </div>
            <div className={`text-sm ${readinessColor} font-medium`}>
              {readinessLevel} • {progressData.completionPercentage}%
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Career Readiness</span>
            <span className="text-sm text-muted-foreground">
              {progressData.completionPercentage}%
            </span>
          </div>
          <div className="relative">
            <Progress value={progressData.completionPercentage} className="h-3" />
            <div 
              className="absolute top-0 left-0 h-3 rounded-full opacity-20"
              style={{ 
                width: `${progressData.completionPercentage}%`,
                backgroundColor: trackColor
              }}
            />
          </div>
        </div>

        {/* Skills breakdown */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium">Required Skills</span>
            </div>
            <div className="text-muted-foreground ml-6">
              {progressData.requiredSkillsCompleted} / {progressData.totalRequiredSkills} completed
            </div>
            <Progress 
              value={(progressData.requiredSkillsCompleted / progressData.totalRequiredSkills) * 100} 
              className="h-2 ml-6" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Optional Skills</span>
            </div>
            <div className="text-muted-foreground ml-6">
              {progressData.optionalSkillsCompleted} / {progressData.totalOptionalSkills} completed
            </div>
            <Progress 
              value={(progressData.optionalSkillsCompleted / progressData.totalOptionalSkills) * 100} 
              className="h-2 ml-6" 
            />
          </div>
        </div>

        {/* Additional info */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {progressData.estimatedTimeRemaining && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {progressData.estimatedTimeRemaining} remaining
              </div>
            )}
            {selectedCareerPath.average_salary && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ${(selectedCareerPath.average_salary / 1000).toFixed(0)}k target
              </div>
            )}
          </div>
          
          {progressData.currentROI && progressData.currentROI > 1.2 && (
            <Badge variant="secondary" className="text-xs text-green-600">
              High ROI Market
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
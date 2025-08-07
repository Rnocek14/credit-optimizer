import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Target, 
  Brain, 
  DollarSign,
  Clock,
  CheckCircle 
} from 'lucide-react';

interface UnifiedProgressData {
  pivotProgress: number;
  criScore: number;
  roiConfidence: number;
  timelineCompletion: number;
  skillsAcquired: number;
  totalSkills: number;
  milestonesCompleted: number;
  totalMilestones: number;
}

interface UnifiedProgressIndicatorProps {
  data: UnifiedProgressData;
  selectedPivot?: any;
  className?: string;
}

export function UnifiedProgressIndicator({ 
  data, 
  selectedPivot,
  className = "" 
}: UnifiedProgressIndicatorProps) {
  const overallProgress = Math.round(
    (data.pivotProgress + data.criScore + data.roiConfidence + data.timelineCompletion) / 4
  );

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const progressMetrics = [
    {
      label: 'Pivot Progress',
      value: data.pivotProgress,
      icon: <TrendingUp className="w-4 h-4" />,
      description: `${data.milestonesCompleted}/${data.totalMilestones} milestones`
    },
    {
      label: 'Career Readiness',
      value: data.criScore,
      icon: <Brain className="w-4 h-4" />,
      description: 'CRI Score'
    },
    {
      label: 'ROI Confidence',
      value: data.roiConfidence,
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Market alignment'
    },
    {
      label: 'Timeline Progress',
      value: data.timelineCompletion,
      icon: <Clock className="w-4 h-4" />,
      description: 'On track'
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Unified Progress
          </div>
          {selectedPivot && (
            <Badge variant="outline" className="bg-primary/10">
              {selectedPivot.new_career}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getProgressColor(overallProgress)}`}>
            {overallProgress}%
          </div>
          <div className="text-sm text-muted-foreground">Overall Progress</div>
          <Progress value={overallProgress} className="mt-2 h-3" />
        </div>

        {/* Skills Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Skills Acquired</span>
            </div>
            <span className="text-sm">{data.skillsAcquired}/{data.totalSkills}</span>
          </div>
          <Progress 
            value={(data.skillsAcquired / data.totalSkills) * 100} 
            className="h-2" 
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {progressMetrics.map((metric, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="text-muted-foreground">
                  {metric.icon}
                </div>
                <span className="text-xs font-medium">{metric.label}</span>
              </div>
              <div className={`text-lg font-bold ${getProgressColor(metric.value)}`}>
                {metric.value}%
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.description}
              </div>
              <Progress value={metric.value} className="h-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
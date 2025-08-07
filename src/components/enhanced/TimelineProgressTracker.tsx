import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, Clock, AlertTriangle, Target, Calendar, 
  TrendingUp, Star, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  estimatedCompletion: string;
  actualCompletion?: string;
  skills: string[];
  priority: 'high' | 'medium' | 'low';
  xpAwarded: number;
}

interface TimelineProgressTrackerProps {
  targetCareer: string;
  overallProgress: number;
  milestones: TimelineMilestone[];
  skillsAcquired: number;
  totalSkills: number;
  estimatedCompletion: string;
  onMilestoneAction: (milestoneId: string, action: string) => void;
}

export function TimelineProgressTracker({
  targetCareer,
  overallProgress,
  milestones,
  skillsAcquired,
  totalSkills,
  estimatedCompletion,
  onMilestoneAction
}: TimelineProgressTrackerProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          badge: 'bg-green-100 text-green-700 border-green-300'
        };
      case 'in_progress':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-100 text-blue-700 border-blue-300'
        };
      case 'blocked':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          badge: 'bg-red-100 text-red-700 border-red-300'
        };
      default:
        return {
          icon: Target,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted border-border',
          badge: 'bg-muted text-muted-foreground border-border'
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const activeMilestones = milestones.filter(m => m.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{targetCareer} Journey</h3>
                <p className="text-sm text-muted-foreground">
                  {completedMilestones}/{milestones.length} milestones completed
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {overallProgress}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
              <div className="text-xs text-muted-foreground">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{skillsAcquired}</div>
              <div className="text-xs text-muted-foreground">Skills Acquired</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeMilestones}</div>
              <div className="text-xs text-muted-foreground">Active Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{estimatedCompletion}</div>
              <div className="text-xs text-muted-foreground">Est. Completion</div>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Development Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {milestones.map((milestone, index) => {
            const statusConfig = getStatusConfig(milestone.status);
            const StatusIcon = statusConfig.icon;
            const isLast = index === milestones.length - 1;

            return (
              <div key={milestone.id} className="relative">
                {/* Connection Line */}
                {!isLast && (
                  <div className="absolute left-6 top-14 w-0.5 h-20 bg-border"></div>
                )}

                <div className="flex gap-4">
                  {/* Status Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    statusConfig.bgColor
                  )}>
                    <StatusIcon className={cn("w-5 h-5", statusConfig.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{milestone.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPriorityColor(milestone.priority))}
                          >
                            {milestone.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                      </div>
                      <Badge className={statusConfig.badge}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium">{milestone.progress}%</span>
                      </div>
                      <Progress value={milestone.progress} className="h-1.5" />
                    </div>

                    {/* Skills and Actions */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex gap-1 flex-wrap">
                        {milestone.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {milestone.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{milestone.skills.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {milestone.xpAwarded > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="w-3 h-3" />
                            {milestone.xpAwarded} XP
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          {milestone.actualCompletion ? 
                            `Completed ${milestone.actualCompletion}` : 
                            `Due ${milestone.estimatedCompletion}`
                          }
                        </div>

                        {milestone.status === 'in_progress' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onMilestoneAction(milestone.id, 'update')}
                            className="h-7 text-xs"
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
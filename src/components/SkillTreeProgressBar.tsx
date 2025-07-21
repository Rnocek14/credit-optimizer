import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, BookOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillTreeProgressBarProps {
  totalSkills: number;
  completedSkills: number;
  inProgressSkills: number;
  goalSkills: number;
  completedGoalSkills: number;
  recommendedSkills: number;
  className?: string;
  isLoading?: boolean;
}

export const SkillTreeProgressBar: React.FC<SkillTreeProgressBarProps> = ({
  totalSkills,
  completedSkills,
  inProgressSkills,
  goalSkills,
  completedGoalSkills,
  recommendedSkills,
  className,
  isLoading = false
}) => {
  const overallProgress = totalSkills > 0 ? (completedSkills / totalSkills) * 100 : 0;
  const goalProgress = goalSkills > 0 ? (completedGoalSkills / goalSkills) * 100 : 0;
  const inProgressPercent = totalSkills > 0 ? (inProgressSkills / totalSkills) * 100 : 0;

  if (isLoading) {
    return (
      <div className={cn("space-y-4 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-2 bg-muted rounded w-full"></div>
          <div className="flex gap-4">
            <div className="h-8 bg-muted rounded w-20"></div>
            <div className="h-8 bg-muted rounded w-20"></div>
            <div className="h-8 bg-muted rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50", className)}>
      {/* Main Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Learning Progress</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {completedSkills} / {totalSkills} skills mastered
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium text-foreground">{Math.round(overallProgress)}%</span>
        </div>
        <div className="relative">
          <Progress 
            value={overallProgress} 
            className="h-3 bg-muted/50"
          />
          {/* In Progress Overlay */}
          {inProgressPercent > 0 && (
            <div 
              className="absolute top-0 left-0 h-full bg-orange-400/60 rounded-full transition-all"
              style={{ width: `${Math.min(inProgressPercent + overallProgress, 100)}%` }}
            />
          )}
        </div>
      </div>

      {/* Goal Progress */}
      {goalSkills > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-yellow-500" />
              <span className="text-muted-foreground">Career Goal Progress</span>
            </div>
            <span className="font-medium text-foreground">{Math.round(goalProgress)}%</span>
          </div>
          <Progress 
            value={goalProgress} 
            className="h-2 bg-muted/50"
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="text-lg font-bold text-green-600">{completedSkills}</div>
        </div>
        
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
          <div className="text-lg font-bold text-orange-600">{inProgressSkills}</div>
        </div>
        
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Recommended</span>
          </div>
          <div className="text-lg font-bold text-yellow-600">{recommendedSkills}</div>
        </div>
      </div>

      {/* Motivational Message */}
      {overallProgress > 0 && (
        <div className="pt-2 border-t border-border/30">
          <div className="text-xs text-center text-muted-foreground">
            {overallProgress >= 75 ? (
              <span className="text-green-600 font-medium">🎉 Excellent progress! You're almost there!</span>
            ) : overallProgress >= 50 ? (
              <span className="text-blue-600 font-medium">🚀 Great momentum! Keep going!</span>
            ) : overallProgress >= 25 ? (
              <span className="text-orange-600 font-medium">📈 Good start! Building solid foundations!</span>
            ) : (
              <span className="text-purple-600 font-medium">🌱 Every expert was once a beginner!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
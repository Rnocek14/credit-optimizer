import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, 
  TrendingUp, 
  Trophy, 
  Target,
  Calendar,
  Zap
} from 'lucide-react';

interface EnhancedStreakCardProps {
  currentStreak: number;
  longestStreak?: number;
  totalXP?: number;
  currentLevel?: number;
  weeklyGoalProgress?: number;
  nextMilestone?: {
    days: number;
    reward: string;
  };
}

export function EnhancedStreakCard({ 
  currentStreak,
  longestStreak = 0,
  totalXP = 0,
  currentLevel = 1,
  weeklyGoalProgress = 75,
  nextMilestone = { days: 7, reward: 'Consistency Champion badge' }
}: EnhancedStreakCardProps) {
  
  const getStreakEmoji = () => {
    if (currentStreak === 0) return '🎯';
    if (currentStreak < 3) return '🔥';
    if (currentStreak < 7) return '⚡';
    if (currentStreak < 14) return '🚀';
    if (currentStreak < 30) return '⭐';
    return '🏆';
  };

  const getStreakMessage = () => {
    if (currentStreak === 0) return 'Ready to start your journey?';
    if (currentStreak < 3) return 'Building momentum!';
    if (currentStreak < 7) return 'Great consistency!';
    if (currentStreak < 14) return 'You\'re on fire!';
    if (currentStreak < 30) return 'Incredible dedication!';
    return 'Legendary learner!';
  };

  const daysToMilestone = nextMilestone.days - (currentStreak % nextMilestone.days);
  const milestoneProgress = ((currentStreak % nextMilestone.days) / nextMilestone.days) * 100;

  return (
    <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Learning Progress
          {currentStreak > longestStreak && longestStreak > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              New Record! 🎉
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Streak Display */}
        <div className="text-center space-y-2">
          <div className="text-4xl">{getStreakEmoji()}</div>
          <div>
            <div className="text-3xl font-bold text-orange-600">
              {currentStreak}
            </div>
            <div className="text-sm text-muted-foreground">
              day{currentStreak !== 1 ? 's' : ''} streak
            </div>
          </div>
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {getStreakMessage()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-lg font-semibold">{longestStreak}</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-lg font-semibold">{totalXP.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total XP</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-lg font-semibold">{currentLevel}</div>
            <div className="text-xs text-muted-foreground">Level</div>
          </div>
        </div>

        {/* Weekly Goal Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Weekly Goal</span>
            </div>
            <span className="font-medium">{weeklyGoalProgress}%</span>
          </div>
          <Progress value={weeklyGoalProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {weeklyGoalProgress >= 100 
              ? 'Weekly goal achieved! 🎉' 
              : `${Math.ceil((100 - weeklyGoalProgress) / 14)} more sessions this week`
            }
          </p>
        </div>

        {/* Next Milestone */}
        {currentStreak > 0 && daysToMilestone > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-950/30 dark:to-yellow-950/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Next Milestone
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-orange-700 dark:text-orange-300">
                  {daysToMilestone} day{daysToMilestone !== 1 ? 's' : ''} to go
                </span>
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  {Math.round(milestoneProgress)}%
                </span>
              </div>
              <Progress 
                value={milestoneProgress} 
                className="h-1.5 bg-orange-200 dark:bg-orange-900"
              />
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Reward: {nextMilestone.reward}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
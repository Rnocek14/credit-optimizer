import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { Flame, Trophy, Star, Zap, Target, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface GamificationDashboardProps {
  userId?: string;
}

export function GamificationDashboard({ userId }: GamificationDashboardProps) {
  const {
    streaks,
    celebrations,
    metrics,
    getCurrentStreak,
    getLongestStreak,
    getStreakMultiplier,
    isLoading
  } = useGamification(userId);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();
  const streakMultiplier = getStreakMultiplier();
  const unreadCelebrations = celebrations?.filter(c => !c.displayed_at) || [];
  const recentCelebrations = celebrations?.slice(0, 5) || [];

  const nextStreakMilestone = Math.ceil(currentStreak / 7) * 7;
  const streakProgress = currentStreak % 7;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">🎮 Gamification Hub</h2>
        <p className="text-muted-foreground">
          Track your learning achievements, streaks, and progress
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              {currentStreak} days
            </div>
            <p className="text-xs text-muted-foreground">
              {streakMultiplier > 1 ? `${Math.round((streakMultiplier - 1) * 100)}% XP bonus` : 'Start learning to build a streak!'}
            </p>
            {currentStreak > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress to {nextStreakMilestone} days</span>
                  <span>{streakProgress}/7</span>
                </div>
                <Progress value={(streakProgress / 7) * 100} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              {longestStreak} days
            </div>
            <p className="text-xs text-muted-foreground">
              Personal best record
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Celebrations</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              {unreadCelebrations.length}
            </div>
            <p className="text-ui-small text-muted-foreground">
              New achievements unlocked
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP Multiplier</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              {streakMultiplier.toFixed(2)}x
            </div>
            <p className="text-xs text-muted-foreground">
              Current bonus rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Celebrations */}
      {recentCelebrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Recent Celebrations
            </CardTitle>
            <CardDescription>
              Your latest achievements and milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCelebrations.map((celebration) => (
                <div
                  key={celebration.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50"
                >
                  <div className="text-2xl">
                    {(celebration.celebration_data as any)?.emoji}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {(celebration.celebration_data as any)?.title}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {celebration.celebration_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(celebration.celebration_data as any)?.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(celebration.created_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  {!celebration.displayed_at && (
                    <Badge variant="secondary" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Learning Streak Progress
          </CardTitle>
          <CardDescription>
            Your daily learning activity and streak building
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current Progress</p>
                <p className="text-xs text-muted-foreground">
                  Keep learning daily to maintain your streak
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-500">
                  🔥 {currentStreak}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentStreak === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>

            {currentStreak > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Next milestone: {nextStreakMilestone} days</span>
                  <span>{Math.max(0, nextStreakMilestone - currentStreak)} days to go</span>
                </div>
                <Progress 
                  value={((currentStreak % 7) / 7) * 100} 
                  className="h-3"
                />
              </div>
            )}

            <div className="grid grid-cols-7 gap-2 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-xs text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {/* Mock streak calendar - in real implementation, this would show actual activity */}
              {Array.from({ length: 21 }, (_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded-sm border flex items-center justify-center text-xs ${
                    i < currentStreak
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-muted border-muted-foreground/20'
                  }`}
                >
                  {i < currentStreak && '🔥'}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Engagement Metrics
            </CardTitle>
            <CardDescription>
              Your learning performance over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Daily XP Average</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(metrics.daily_xp / 30)}
                </p>
                <p className="text-xs text-muted-foreground">
                  XP per day
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Streak Bonus XP</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(metrics.streak_bonus)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Bonus earned
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Maya Collaboration</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(metrics.maya_collaboration_score * 100)}%
                </p>
                <p className="text-ui-small text-muted-foreground">
                  Response rate
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Engagement Trend</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(metrics.engagement_trend * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Overall trend
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
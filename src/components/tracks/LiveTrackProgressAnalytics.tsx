import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Zap, 
  BookOpen, 
  Award,
  Brain,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useCRIEngine } from '@/hooks/useCRIEngine';
import { useMayaCRIIntegration } from '@/hooks/useMayaCRIIntegration';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useTrackXP } from '@/hooks/useTrackXP';
import { useRealtimeXP } from '@/hooks/useRealtimeXP';
import { RealtimeXPTracker } from '@/components/RealtimeXPTracker';

export function LiveTrackProgressAnalytics() {
  const { activeTrackId } = useActiveTrackStore();
  const { user } = useSecureAuth();
  
  // Live CRI data
  const { 
    criBreakdown, 
    isLoading: criLoading, 
    recalculateCRI, 
    isRecalculating 
  } = useCRIEngine(user?.id, activeTrackId);
  
  // Track-specific course progress
  const { courseProgress } = useCourseProgress(user?.id);
  
  // Real-time XP tracking
  const { currentXP: realtimeXP, currentLevel: realtimeLevel } = useRealtimeXP();
  
  // Track XP data (fallback)
  const { xp: trackXPData } = useTrackXP(activeTrackId);
  
  // Maya CRI insights
  const { 
    insights, 
    trajectory, 
    generateCRIGuidance,
    generateCareerTrajectory 
  } = useMayaCRIIntegration(user?.id);

  // Calculate track-specific metrics
  const trackMetrics = React.useMemo(() => {
    const coursesInProgress = courseProgress?.filter(c => c.status === 'in_progress').length || 0;
    const coursesCompleted = courseProgress?.filter(c => c.status === 'completed').length || 0;
    const totalCourses = courseProgress?.length || 0;
    const completionRate = totalCourses > 0 ? (coursesCompleted / totalCourses) * 100 : 0;
    
    return {
      coursesInProgress,
      coursesCompleted,
      totalCourses,
      completionRate,
      currentXP: realtimeXP || trackXPData?.total_xp || 0,
      currentLevel: realtimeLevel || Math.floor((trackXPData?.total_xp || 0) / 100) + 1,
      criScore: criBreakdown?.criScore || 0,
      criLevel: criBreakdown?.level || 'Beginner',
      weeklyVelocity: 0, // Will be calculated from actual data
      estimatedCompletion: trajectory?.timeToTarget || 'Calculating...',
      skillsAcquired: criBreakdown?.components.skills || 0,
      certificationsEarned: 0 // From actual certifications data
    };
  }, [courseProgress, trackXPData, realtimeXP, realtimeLevel, criBreakdown, trajectory]);

  const completionPercentage = trackMetrics.completionRate;
  const xpProgress = trackMetrics.currentLevel > 1 ? 75 : 40; // Simplified for now

  if (!activeTrackId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Please select a track to view progress analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Track Progress Overview
            {criLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Live analytics for your active track {activeTrackId ? `(Track ${activeTrackId.slice(0, 8)})` : ''}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* CRI Score and Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Career Readiness Index
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant={trackMetrics.criScore >= 70 ? 'default' : 'secondary'}>
                  {trackMetrics.criScore} / 100
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => recalculateCRI(activeTrackId)}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Update'}
                </Button>
              </div>
            </div>
            <Progress value={trackMetrics.criScore} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Level: {trackMetrics.criLevel}</span>
              <span>{criBreakdown?.trend.direction === 'improving' ? '↗️' : criBreakdown?.trend.direction === 'declining' ? '↘️' : '→'} {criBreakdown?.trend.change ? `${criBreakdown.trend.change > 0 ? '+' : ''}${criBreakdown.trend.change.toFixed(1)}` : ''}</span>
            </div>
          </div>

          {/* Course Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Course Progress
              </h4>
              <Badge variant="outline">
                {trackMetrics.coursesCompleted}/{trackMetrics.totalCourses} completed
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{trackMetrics.coursesInProgress} in progress</span>
              <span>{completionPercentage.toFixed(1)}% complete</span>
            </div>
          </div>

          {/* Real-time XP Tracker */}
          <RealtimeXPTracker showTestButton={true} />

          {/* XP & Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Experience Points
              </h4>
              <Badge variant="secondary">
                Level {trackMetrics.currentLevel}
              </Badge>
            </div>
            <Progress value={xpProgress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{trackMetrics.currentXP} XP</span>
              <span>Track specific XP</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{trackMetrics.criScore}</div>
              <div className="text-sm text-muted-foreground">CRI Score</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{Math.round(trackMetrics.skillsAcquired)}</div>
              <div className="text-sm text-muted-foreground">Skills Progress</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{trackMetrics.estimatedCompletion}</div>
              <div className="text-sm text-muted-foreground">Time to Target</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{trackMetrics.certificationsEarned}</div>
              <div className="text-sm text-muted-foreground">Certifications</div>
            </div>
          </div>

          {/* Maya Insights */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Maya CRI Insights
              </h4>
              <div className="space-y-2">
                {insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {insight.priority}
                      </Badge>
                      <span className="text-sm font-medium">{insight.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateCRIGuidance()}
                >
                  Get Maya Guidance
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateCareerTrajectory()}
                >
                  Update Trajectory
                </Button>
              </div>
            </div>
          )}

          {/* Timeline Estimate */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Completion Timeline
            </h4>
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div>
                <div className="font-medium">Estimated Completion</div>
                <div className="text-sm text-muted-foreground">
                  {trajectory ? 'Maya AI prediction' : 'Based on current progress'}
                </div>
              </div>
              <Badge variant="default" className="text-lg px-3 py-1">
                {trackMetrics.estimatedCompletion}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
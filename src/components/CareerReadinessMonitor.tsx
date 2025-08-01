import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Brain,
  BarChart3,
  Shield,
  Clock
} from 'lucide-react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCRIGoals } from '@/hooks/useCRIGoals';

interface CareerReadinessMonitorProps {
  userId: string;
}

export function CareerReadinessMonitor({ userId }: CareerReadinessMonitorProps) {
  const { 
    criScore,
    isLoading,
    error
  } = useCareerReadiness({ userId });

  const {
    criGoal,
    targetCRI,
    isUpdating,
    updateGoal
  } = useCRIGoals(userId);

  const [insights, setInsights] = useState<any[]>([]);
  const [monitoringActive, setMonitoringActive] = useState(true);

  useEffect(() => {
    // Mock actionable insights based on CRI score
    const mockInsights = [
      {
        type: 'improvement',
        title: 'Skills Gap Identified',
        description: 'Your technical score could be improved with additional certifications.',
        priority: 'high',
        action: 'View Recommendations'
      },
      {
        type: 'warning',
        title: 'Market Alignment',
        description: 'Current market trends suggest focusing on cloud technologies.',
        priority: 'medium',
        action: 'Update Learning Path'
      }
    ];
    setInsights(mockInsights);
  }, [criScore]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading career readiness data: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  const currentCRI = criScore?.overall || 0;
  const progressToGoal = Math.min((currentCRI / targetCRI) * 100, 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Career Readiness Monitor</h1>
          <p className="text-muted-foreground">Real-time tracking of your career advancement readiness</p>
        </div>
        <Button disabled={isLoading}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* CRI Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            CRI Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{currentCRI.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Current CRI Score</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{targetCRI}</p>
              <p className="text-sm text-muted-foreground">Target CRI</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Goal</span>
              <span>{progressToGoal.toFixed(1)}%</span>
            </div>
            <Progress value={progressToGoal} className="h-3" />
          </div>

          {progressToGoal >= 100 ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Congratulations! You've reached your CRI goal. Consider setting a higher target.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              You need {(targetCRI - currentCRI).toFixed(1)} more points to reach your goal.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Readiness Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Skills Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {criScore?.skillsScore?.toFixed(1) || 0}
                </span>
                <Badge variant={getScoreBadgeVariant(criScore?.skillsScore || 0)}>
                  Technical
                </Badge>
              </div>
              <Progress value={criScore?.skillsScore || 0} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Based on skill assessments and course completions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Experience Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {criScore?.experienceScore?.toFixed(1) || 0}
                </span>
                <Badge variant={getScoreBadgeVariant(criScore?.experienceScore || 0)}>
                  Experience
                </Badge>
              </div>
              <Progress value={criScore?.experienceScore || 0} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Projects, certifications, and practical experience
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Market Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {criScore?.stepsScore?.toFixed(1) || 0}
                </span>
                <Badge variant={getScoreBadgeVariant(criScore?.stepsScore || 0)}>
                  Market
                </Badge>
              </div>
              <Progress value={criScore?.stepsScore || 0} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Alignment with current market demands
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No actionable insights available. Your career readiness is on track!
            </p>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {insight.type === 'improvement' ? (
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                      ) : insight.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <h4 className="font-medium">{insight.title}</h4>
                    </div>
                    <Badge variant="outline">{insight.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  {insight.action && (
                    <div className="pt-2">
                      <Button size="sm" variant="outline">
                        {insight.action}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Monitoring Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monitoring Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Real-time Monitoring</p>
              <p className="text-sm text-muted-foreground">
                Continuous tracking of career readiness metrics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${monitoringActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm">{monitoringActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
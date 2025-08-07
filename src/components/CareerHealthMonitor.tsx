import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Target,
  Brain,
  Activity,
  CheckCircle
} from 'lucide-react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useGamification } from '@/hooks/useGamification';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useCRIGoals } from '@/hooks/useCRIGoals';

interface CareerHealthMonitorProps {
  userId: string;
}

interface HealthAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export function CareerHealthMonitor({ userId }: CareerHealthMonitorProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);
  
  const { criScore, userProgress, isLoading: criLoading } = useCareerReadiness({ userId });
  const { metrics, streaks, isLoading: isLoadingMetrics } = useGamification(userId);
  const { targetCRI } = useCRIGoals(userId);
  const { analyzeMarketTrends } = useMarketIntelligence();

  // Calculate overall career health score
  const calculateHealthScore = () => {
    if (!criScore || !metrics) return 0;
    
    const criWeight = 0.4;
    const engagementWeight = 0.3;
    const streakWeight = 0.2;
    const progressWeight = 0.1;
    
    const criNormalized = (criScore.overall_score / 100) * criWeight;
    const engagementNormalized = (metrics.total_xp / 1000) * engagementWeight; // Normalize XP
    const streakNormalized = Math.min(1, (streaks?.[0]?.current_streak || 0) / 30) * streakWeight;
    const progressNormalized = (Object.keys(userProgress || {}).length / 50) * progressWeight;
    
    return Math.round((criNormalized + engagementNormalized + streakNormalized + progressNormalized) * 100);
  };

  const healthScore = calculateHealthScore();

  // Generate health alerts based on data analysis
  useEffect(() => {
    const alerts: HealthAlert[] = [];
    
    if (criScore && targetCRI) {
      const gap = targetCRI - criScore.overall;
      if (gap > 20) {
        alerts.push({
          id: 'cri-gap',
          type: 'warning',
          title: 'CRI Score Gap Detected',
          description: `You're ${gap} points below your target CRI of ${targetCRI}`,
          action: 'Focus on skill development',
          priority: 'high'
        });
      }
    }

    if (streaks && streaks.length > 0) {
      const currentStreak = streaks[0]?.current_streak || 0;
      if (currentStreak === 0) {
        alerts.push({
          id: 'broken-streak',
          type: 'danger',
          title: 'Learning Streak Broken',
          description: 'Your learning momentum has stopped',
          action: 'Start a new learning session',
          priority: 'medium'
        });
      }
    }

    if (metrics) {
      const xpThisWeek = metrics.daily_xp; // Simplified for demo
      if (xpThisWeek < 50) {
        alerts.push({
          id: 'low-activity',
          type: 'info',
          title: 'Low Activity This Week',
          description: 'Consider increasing your learning activity',
          action: 'Set weekly learning goals',
          priority: 'low'
        });
      }
    }

    setHealthAlerts(alerts);
  }, [criScore, targetCRI, streaks, metrics]);

  const getHealthStatus = () => {
    if (healthScore >= 80) return { status: 'Excellent', color: 'text-green-500', icon: CheckCircle };
    if (healthScore >= 60) return { status: 'Good', color: 'text-blue-500', icon: TrendingUp };
    if (healthScore >= 40) return { status: 'Fair', color: 'text-yellow-500', icon: AlertTriangle };
    return { status: 'Needs Attention', color: 'text-red-500', icon: TrendingDown };
  };

  const healthStatus = getHealthStatus();
  const StatusIcon = healthStatus.icon;

  if (criLoading || isLoadingMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Career Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-lg">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Career Health Monitor</h2>
              <p className="text-muted-foreground">Real-time career trajectory analysis</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Health Score */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${healthStatus.color}`} />
                <span className="font-medium">Overall Health</span>
              </div>
              <div className="text-3xl font-bold">{healthScore}%</div>
              <div className={`text-sm ${healthStatus.color}`}>{healthStatus.status}</div>
              <Progress value={healthScore} className="w-full" />
            </div>

            {/* CRI Progress */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                <span className="font-medium">CRI Score</span>
              </div>
              <div className="text-3xl font-bold">{criScore?.overall || 0}</div>
              <div className="text-sm text-muted-foreground">Target: {targetCRI}</div>
              <Progress value={(criScore?.overall || 0)} className="w-full" />
            </div>

            {/* Learning Streak */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="font-medium">Learning Streak</span>
              </div>
              <div className="text-3xl font-bold">{streaks?.[0]?.current_streak || 0}</div>
              <div className="text-sm text-muted-foreground">days active</div>
              <Progress value={Math.min(100, (streaks?.[0]?.current_streak || 0) * 3.33)} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Health Overview</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skills Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Skills Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Technical Skills</span>
                    <span>{criScore?.skillsScore || 0}%</span>
                  </div>
                  <Progress value={criScore?.skillsScore || 0} />
                  
                  <div className="flex justify-between">
                    <span>Experience Level</span>
                    <span>{criScore?.breakdown?.experience || 0}%</span>
                  </div>
                  <Progress value={criScore?.breakdown?.experience || 0} />
                  
                  <div className="flex justify-between">
                    <span>Career Steps</span>
                    <span>{criScore?.breakdown?.steps || 0}%</span>
                  </div>
                  <Progress value={criScore?.breakdown?.steps || 0} />
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total XP</span>
                    <span>{metrics?.daily_xp || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Current Level</span>
                    <span>{metrics?.current_level || 1}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Achievements</span>
                    <span>{Object.keys(userProgress || {}).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {healthAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No active health alerts</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {healthAlerts.map((alert) => (
                <Alert key={alert.id} className={`border-l-4 ${
                  alert.type === 'danger' ? 'border-l-red-500' :
                  alert.type === 'warning' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">{alert.description}</div>
                      </div>
                      {alert.action && (
                        <Button variant="outline" size="sm">
                          {alert.action}
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Career Health Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span>Skills growth trending upward</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Last 30 days</span>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span>Career resilience improving</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Market alignment</span>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-yellow-500" />
                    <span>Goal achievement on track</span>
                  </div>
                  <span className="text-sm text-muted-foreground">85% completion rate</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
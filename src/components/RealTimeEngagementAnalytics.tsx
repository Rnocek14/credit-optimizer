import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, Users, Clock, Target, BarChart3 } from 'lucide-react';

interface RealTimeEngagementAnalyticsProps {
  userId: string;
}

interface EngagementMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface UserPattern {
  type: string;
  description: string;
  confidence: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export function RealTimeEngagementAnalytics({ userId }: RealTimeEngagementAnalyticsProps) {
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);
  const [userPatterns, setUserPatterns] = useState<UserPattern[]>([]);
  const [realTimeData, setRealTimeData] = useState({
    currentUsers: 0,
    avgSessionTime: 0,
    completionRate: 0,
    engagementScore: 0
  });

  useEffect(() => {
    generateMockAnalytics();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      updateRealTimeMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateMockAnalytics = () => {
    const metrics: EngagementMetric[] = [
      {
        label: 'Daily Active Learning',
        value: 85,
        change: 12,
        trend: 'up'
      },
      {
        label: 'Workflow Completion',
        value: 73,
        change: -3,
        trend: 'down'
      },
      {
        label: 'Skill Progression',
        value: 91,
        change: 8,
        trend: 'up'
      },
      {
        label: 'Goal Achievement',
        value: 67,
        change: 15,
        trend: 'up'
      }
    ];

    const patterns: UserPattern[] = [
      {
        type: 'Learning Velocity',
        description: 'User demonstrates consistent daily learning patterns with peak activity at 2-4 PM',
        confidence: 89,
        impact: 'positive'
      },
      {
        type: 'Workflow Engagement',
        description: 'High engagement with autonomous workflows but tends to pause complex tasks',
        confidence: 76,
        impact: 'neutral'
      },
      {
        type: 'Skill Focus',
        description: 'Strong preference for technical skills over soft skills development',
        confidence: 92,
        impact: 'positive'
      },
      {
        type: 'Goal Completion',
        description: 'Consistent progress on short-term goals, occasional delays on long-term objectives',
        confidence: 84,
        impact: 'neutral'
      }
    ];

    setEngagementMetrics(metrics);
    setUserPatterns(patterns);
    setRealTimeData({
      currentUsers: Math.floor(Math.random() * 50) + 20,
      avgSessionTime: Math.floor(Math.random() * 30) + 25,
      completionRate: Math.floor(Math.random() * 20) + 70,
      engagementScore: Math.floor(Math.random() * 15) + 80
    });
  };

  const updateRealTimeMetrics = () => {
    setRealTimeData(prev => ({
      currentUsers: Math.max(1, prev.currentUsers + (Math.random() > 0.5 ? 1 : -1)),
      avgSessionTime: Math.max(10, prev.avgSessionTime + (Math.random() > 0.5 ? 1 : -1)),
      completionRate: Math.min(100, Math.max(50, prev.completionRate + (Math.random() - 0.5) * 2)),
      engagementScore: Math.min(100, Math.max(60, prev.engagementScore + (Math.random() - 0.5) * 3))
    }));
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-destructive rotate-180" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPatternImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'border-success bg-success/5';
      case 'negative': return 'border-destructive bg-destructive/5';
      default: return 'border-muted bg-muted/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-Time Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Real-Time Engagement Analytics</h2>
              <p className="text-sm text-muted-foreground">Live user behavior and learning patterns</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-success/10 text-success border-success">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold">{realTimeData.currentUsers}</span>
              </div>
              <div className="text-sm text-muted-foreground">Active Learners</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold">{realTimeData.avgSessionTime}m</span>
              </div>
              <div className="text-sm text-muted-foreground">Avg Session</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold">{realTimeData.completionRate}%</span>
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold">{realTimeData.engagementScore}</span>
              </div>
              <div className="text-sm text-muted-foreground">Engagement Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {engagementMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm ${
                      metric.change > 0 ? 'text-success' : 
                      metric.change < 0 ? 'text-destructive' : 
                      'text-muted-foreground'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={metric.value} className="flex-1 h-2" />
                  <span className="text-sm font-medium w-12 text-right">{metric.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Behavior Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Pattern Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPatterns.map((pattern, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${getPatternImpactColor(pattern.impact)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{pattern.type}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {pattern.confidence}% confidence
                    </Badge>
                    <Badge 
                      variant={pattern.impact === 'positive' ? 'default' : 
                              pattern.impact === 'negative' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {pattern.impact}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-primary">High Engagement Forecast</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Based on current patterns, user is likely to complete 2-3 more learning modules this week
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">87% likelihood</Badge>
              </div>
            </div>
            
            <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
              <h4 className="font-medium text-warning">Attention Required</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Workflow completion rate has decreased. Suggest simplifying next tasks or providing assistance
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">72% confidence</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
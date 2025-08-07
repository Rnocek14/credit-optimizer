import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, TrendingUp, Activity, Settings, BarChart3 } from 'lucide-react';
import { useEnhancedPhase5 } from '@/hooks/useEnhancedPhase5';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Phase5ValidationDashboard } from '@/components/Phase5ValidationDashboard';
import { MayaPhase5Test } from '@/components/MayaPhase5Test';
import { EnhancedMayaIntelligence } from '@/components/EnhancedMayaIntelligence';
import { RealTimeEngagementAnalytics } from '@/components/RealTimeEngagementAnalytics';
import { WorkflowIntelligencePanel } from '@/components/WorkflowIntelligencePanel';

interface Phase5DashboardProps {
  userId: string;
}

export function Phase5Dashboard({ userId }: Phase5DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { status, loading, triggerMayaDecision, createMarketAlert } = useEnhancedPhase5();
  const { profile: userProfile } = useUserProfile(userId);

  const getHealthStatusColor = (health: number) => {
    if (health >= 90) return 'bg-success text-success-foreground';
    if (health >= 70) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const handleCreateTestWorkflow = async () => {
    await triggerMayaDecision({
      userId,
      profile: userProfile,
      requestType: 'autonomous_workflow',
      context: 'Phase 5 enhanced capabilities test'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phase 5 - Enhanced AI Systems</h1>
          <p className="text-muted-foreground">
            Autonomous workflows, predictive analytics, and real-time intelligence
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge 
            className={`px-3 py-1 ${getHealthStatusColor(status.metrics.systemHealth)}`}
          >
            System Health: {status.metrics.systemHealth}%
          </Badge>
          <Badge variant="outline">
            {status.connectionStatus === 'connected' ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
              <p className="text-2xl font-bold">{status.metrics.autonomousWorkflows}</p>
            </div>
            <Zap className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Maya Decisions</p>
              <p className="text-2xl font-bold">{status.metrics.mayaDecisions}</p>
            </div>
            <Brain className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Market Alerts</p>
              <p className="text-2xl font-bold">{status.metrics.marketAlerts}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prediction Accuracy</p>
              <p className="text-2xl font-bold">{status.metrics.predictiveAccuracy}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intelligence">Maya Intelligence</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Enhanced Maya Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Advanced AI decision-making with real workflow integration and predictive capabilities.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Decision Accuracy</span>
                    <span className="text-sm font-medium">{status.metrics.predictiveAccuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Recent Decisions</span>
                    <span className="text-sm font-medium">{status.metrics.mayaDecisions}</span>
                  </div>
                </div>
                <Button 
                  onClick={handleCreateTestWorkflow}
                  className="w-full mt-4"
                  size="sm"
                >
                  Generate Test Decision
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-Time Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Live engagement tracking, pattern recognition, and behavioral analytics.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">System Health</span>
                    <span className="text-sm font-medium">{status.metrics.systemHealth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Monitoring</span>
                    <span className="text-sm font-medium">{status.metrics.marketAlerts} alerts</span>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => setActiveTab('analytics')}
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Phase 5 System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{status.metrics.autonomousWorkflows}</div>
                  <div className="text-sm text-muted-foreground">Autonomous Workflows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{status.metrics.mayaDecisions}</div>
                  <div className="text-sm text-muted-foreground">AI Decisions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{status.metrics.marketAlerts}</div>
                  <div className="text-sm text-muted-foreground">Market Alerts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{status.metrics.predictiveAccuracy}%</div>
                  <div className="text-sm text-muted-foreground">Prediction Accuracy</div>
                </div>
              </div>
              
              {status.lastUpdate && (
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  Last updated: {status.lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence">
          <EnhancedMayaIntelligence userId={userId} />
        </TabsContent>

        <TabsContent value="analytics">
          <RealTimeEngagementAnalytics userId={userId} />
        </TabsContent>

        <TabsContent value="workflows">
          <WorkflowIntelligencePanel userId={userId} />
        </TabsContent>

        <TabsContent value="validation">
          <div className="space-y-6">
            <Phase5ValidationDashboard />
            <MayaPhase5Test />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
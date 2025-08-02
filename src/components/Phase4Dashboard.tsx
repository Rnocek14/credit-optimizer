import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, TrendingUp, Users, Brain, Activity } from 'lucide-react';
import { AutonomousWorkflowDashboard } from './AutonomousWorkflowDashboard';
import { PredictiveAnalyticsEngine } from './PredictiveAnalyticsEngine';
import RealTimeMarketPulse from './RealTimeMarketPulse';
import { EnterpriseCollaborationHub } from './EnterpriseCollaborationHub';
import { MayaAutonomousIntelligence } from './MayaAutonomousIntelligence';
import { CareerReadinessMonitor } from './CareerReadinessMonitor';
import { EnhancedWorkflowEngine } from './EnhancedWorkflowEngine';
import { RealTimeMarketIntelligence } from './RealTimeMarketIntelligence';

interface Phase4DashboardProps {
  userId: string;
}

export function Phase4Dashboard({ userId }: Phase4DashboardProps) {
  const [activeTab, setActiveTab] = useState('autonomous');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Phase 5: Enhanced AI Systems</h1>
              <p className="text-muted-foreground">Real-Time Intelligence & Autonomous Workflows</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              Phase 5 Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="autonomous" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="enhanced" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Enhanced Engine
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Predictive
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Market Pulse
          </TabsTrigger>
          <TabsTrigger value="market-intel" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Market Intel
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Maya AI
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Collaboration
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="autonomous" className="space-y-6">
          <AutonomousWorkflowDashboard />
        </TabsContent>

        <TabsContent value="enhanced" className="space-y-6">
          <EnhancedWorkflowEngine />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <PredictiveAnalyticsEngine />
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <RealTimeMarketPulse />
        </TabsContent>

        <TabsContent value="market-intel" className="space-y-6">
          <RealTimeMarketIntelligence />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <MayaAutonomousIntelligence />
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-6">
          <EnterpriseCollaborationHub />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <CareerReadinessMonitor userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
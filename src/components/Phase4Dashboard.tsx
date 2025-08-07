import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, TrendingUp, Users, Brain, Activity, Heart, Target } from 'lucide-react';
import { AutonomousWorkflowDashboard } from './AutonomousWorkflowDashboard';
import { PredictiveAnalyticsEngine } from './PredictiveAnalyticsEngine';
import RealTimeMarketPulse from './RealTimeMarketPulse';
import { EnterpriseCollaborationHub } from './EnterpriseCollaborationHub';
import { MayaAutonomousIntelligence } from './MayaAutonomousIntelligence';
import { CareerReadinessMonitor } from './CareerReadinessMonitor';
import { EnhancedWorkflowEngine } from './EnhancedWorkflowEngine';
import { RealTimeMarketIntelligence } from './RealTimeMarketIntelligence';
import { CareerTransitionSimulator } from './CareerTransitionSimulator';
import { CareerHealthMonitor } from './CareerHealthMonitor';
import { UnifiedIntelligencePanel } from './UnifiedIntelligencePanel';
import { GoalOrchestrator } from './GoalOrchestrator';

interface Phase4DashboardProps {
  userId: string;
}

export function Phase4Dashboard({ userId }: Phase4DashboardProps) {
  const [activeTab, setActiveTab] = useState('copilot');

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
              <h1 className="text-2xl font-bold">Phase 4: Autonomous Career Co-Pilot</h1>
              <p className="text-muted-foreground">AI-Powered Career Transition & Autonomous Workflows</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              Phase 4 Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="copilot" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Co-Pilot Hub
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Career Health
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Unified Intel
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Goal Orchestrator
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Transition Sim
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copilot" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CareerTransitionSimulator userId={userId} />
            <div className="space-y-6">
              <MayaAutonomousIntelligence />
              <CareerReadinessMonitor userId={userId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <CareerHealthMonitor userId={userId} />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <UnifiedIntelligencePanel userId={userId} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalOrchestrator userId={userId} />
        </TabsContent>

        <TabsContent value="simulator" className="space-y-6">
          <CareerTransitionSimulator userId={userId} />
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutonomousWorkflowDashboard />
            <EnhancedWorkflowEngine />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PredictiveAnalyticsEngine />
            <RealTimeMarketIntelligence />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
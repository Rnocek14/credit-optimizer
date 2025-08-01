import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Settings, 
  BarChart3, 
  Shield, 
  Brain,
  Workflow,
  Activity,
  Users
} from 'lucide-react';
import { MayaFeedbackSystem } from './MayaFeedbackSystem';
import { MayaControlCenter } from './MayaControlCenter';
import { WorkflowManagementInterface } from './WorkflowManagementInterface';
import { MayaControlDashboard } from './MayaControlDashboard';
import { ProductionReadinessTest } from './ProductionReadinessTest';

interface FeatureStatus {
  name: string;
  status: 'active' | 'beta' | 'coming_soon';
  description: string;
  users: number;
}

export function Phase6FeedbackControlUI() {
  const [activeTab, setActiveTab] = useState('feedback');

  const featureStatus: FeatureStatus[] = [
    {
      name: 'Advanced Feedback System',
      status: 'active',
      description: 'Context-aware feedback collection and sentiment analysis',
      users: 1247
    },
    {
      name: 'Maya Control Center',
      status: 'active',
      description: 'Complete personalization and autonomous action controls',
      users: 892
    },
    {
      name: 'Workflow Management',
      status: 'active',
      description: 'Advanced workflow templates and performance analytics',
      users: 645
    },
    {
      name: 'Real-Time Control Dashboard',
      status: 'active',
      description: 'Live system monitoring and emergency controls',
      users: 234
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'beta': return 'bg-blue-100 text-blue-800';
      case 'coming_soon': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Phase 6 Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Phase 6: Feedback & Control UI
              </CardTitle>
              <CardDescription>
                Advanced user feedback collection and comprehensive control interfaces for Maya's autonomous systems
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800">
              ✅ Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureStatus.map((feature) => (
              <div key={feature.name} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{feature.name}</h4>
                  <Badge className={getStatusColor(feature.status)}>
                    {feature.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{feature.users} users</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback System
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Control Center
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Workflow Management
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Control Dashboard
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Production Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Advanced Feedback System
              </CardTitle>
              <CardDescription>
                Intelligent feedback collection based on user interactions with context-aware prompts, 
                sentiment analysis, and continuous improvement tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MayaFeedbackSystem />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Maya Control Center
              </CardTitle>
              <CardDescription>
                Complete user control over Maya's autonomous operations, personalization settings, 
                privacy controls, and autonomous action management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MayaControlCenter />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Workflow Management Interface
              </CardTitle>
              <CardDescription>
                Advanced workflow templates library, custom workflow builder, batch operations, 
                and comprehensive performance analytics for workflow optimization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowManagementInterface />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Control Dashboard
              </CardTitle>
              <CardDescription>
                Live Maya activity monitoring, emergency workflow controls, system health monitoring, 
                and resource usage management with real-time alerts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MayaControlDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <ProductionReadinessTest />
        </TabsContent>
      </Tabs>

      {/* Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Phase 6 Implementation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">✅ Completed Features</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Advanced Feedback System with sentiment analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Maya Control Center with full personalization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Workflow Management Interface with templates
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Real-Time Control Dashboard with monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Emergency pause/resume controls
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Privacy and data usage controls
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">🎯 Key Capabilities</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Context-aware feedback collection
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Autonomous action approval controls
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Workflow template library and sharing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Live system health monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Resource usage alerts and limits
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Professional-grade control interfaces
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Phase 6 Complete</h4>
            </div>
            <p className="text-green-700 text-sm">
              Maya now has comprehensive feedback and control systems, giving users complete agency 
              over autonomous operations while maintaining sophisticated AI-driven capabilities. 
              Ready for production deployment with full user control and monitoring.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
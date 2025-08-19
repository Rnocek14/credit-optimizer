import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoAutomationSuite } from './DemoAutomationSuite';
import { IntegrationTestMatrix } from './IntegrationTestMatrix';
import { PerformanceBenchmarkSuite } from './PerformanceBenchmarkSuite';
import { MayaPhase5Test } from './MayaPhase5Test';
import { CareerGraphTest } from './CareerGraphTest';
import { MarketIntelligenceTest } from './MarketIntelligenceTest';
import { PlayCircle, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface QAMetrics {
  demoFlowsScore: number;
  integrationScore: number;
  performanceScore: number;
  overallReadiness: number;
}

export function QADashboard() {
  const [metrics, setMetrics] = useState<QAMetrics>({
    demoFlowsScore: 0,
    integrationScore: 0,
    performanceScore: 0,
    overallReadiness: 0
  });

  const getReadinessLevel = (score: number) => {
    if (score >= 90) return { level: 'Production Ready', variant: 'default', icon: CheckCircle, color: 'text-green-500' };
    if (score >= 80) return { level: 'Demo Ready', variant: 'secondary', icon: PlayCircle, color: 'text-blue-500' };
    if (score >= 70) return { level: 'Needs Polish', variant: 'secondary', icon: AlertTriangle, color: 'text-yellow-500' };
    return { level: 'Significant Work Required', variant: 'destructive', icon: AlertTriangle, color: 'text-red-500' };
  };

  const readiness = getReadinessLevel(metrics.overallReadiness);
  const ReadinessIcon = readiness.icon;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">AI Career Co-Pilot QA Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive testing and validation suite for Phase 2 Week 2 integration
        </p>
        
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <ReadinessIcon className={`h-5 w-5 ${readiness.color}`} />
              Demo Readiness Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <div className="text-2xl font-bold">{metrics.overallReadiness}%</div>
            <Badge variant={readiness.variant as any}>{readiness.level}</Badge>
            <div className="text-sm text-muted-foreground">
              Based on demo flows, integration, and performance scores
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Demo Flows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.demoFlowsScore}%</div>
              <div className="text-xs text-muted-foreground">3 core flows</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.integrationScore}%</div>
              <div className="text-xs text-muted-foreground">Cross-system</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.performanceScore}%</div>
              <div className="text-xs text-muted-foreground">Benchmarks</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="demo-flows" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="demo-flows">Demo Flows</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="maya-test">Maya Test</TabsTrigger>
          <TabsTrigger value="graph-test">Graph Test</TabsTrigger>
          <TabsTrigger value="market-test">Market Test</TabsTrigger>
        </TabsList>

        <TabsContent value="demo-flows">
          <DemoAutomationSuite />
        </TabsContent>

        <TabsContent value="integration">
          <IntegrationTestMatrix />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceBenchmarkSuite />
        </TabsContent>

        <TabsContent value="maya-test">
          <div className="flex justify-center">
            <MayaPhase5Test />
          </div>
        </TabsContent>

        <TabsContent value="graph-test">
          <div className="flex justify-center">
            <CareerGraphTest />
          </div>
        </TabsContent>

        <TabsContent value="market-test">
          <div className="flex justify-center">
            <MarketIntelligenceTest />
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>QA Checklist - Demo Success Criteria</CardTitle>
          <CardDescription>
            Validation checklist based on QA_DEMO_SCRIPT.md requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Must-Have Features</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  All 3 demo flows complete
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Cross-system integration
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Certificate generation
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Real-time updates
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Quality Indicators</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  AI responses relevant
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  UI responsive
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Data persistence
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Performance targets
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">User Experience</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Loading states clear
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Success feedback
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Error handling
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  Mobile responsive
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
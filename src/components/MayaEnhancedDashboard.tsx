import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, TrendingUp, Settings } from 'lucide-react';
import { MayaIntelligenceCore } from './MayaIntelligenceCore';
import { MayaAutonomousActions } from './MayaAutonomousActions';
import { MayaRealTimeInsights } from './MayaRealTimeInsights';
import { EnhancedMayaDemo } from './EnhancedMayaDemo';
import { MayaPhase5Test } from './MayaPhase5Test';

export function MayaEnhancedDashboard() {
  const [activeTab, setActiveTab] = useState('intelligence');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Maya Enhanced Response System</h1>
              <p className="text-muted-foreground">Phase 5: Advanced Intelligence & Autonomous Operations</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
              Phase 5 Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Intelligence Core
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Autonomous Actions
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Real-Time Insights
          </TabsTrigger>
          <TabsTrigger value="interface" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Maya Interface
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="space-y-6">
          <MayaIntelligenceCore />
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <MayaAutonomousActions />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <MayaRealTimeInsights />
        </TabsContent>

        <TabsContent value="interface" className="space-y-6">
          <EnhancedMayaDemo />
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <MayaPhase5Test />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Network, Eye, Settings, Users } from 'lucide-react';
import { Phase6ValidationDashboard } from './Phase6ValidationDashboard';
import { Phase6IntelligenceCore } from './Phase6IntelligenceCore';
import { Phase6CollaborationHub } from './Phase6CollaborationHub';
import { Phase6AdvancedUX } from './Phase6AdvancedUX';
import { Phase6EnterpriseFeatures } from './Phase6EnterpriseFeatures';
import { Phase6ProductionOptimization } from './Phase6ProductionOptimization';

interface Phase6DashboardProps {
  userId: string;
}

export function Phase6Dashboard({ userId }: Phase6DashboardProps) {
  const [activeTab, setActiveTab] = useState('validation');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Phase 6: Next-Generation Intelligence</h1>
              <p className="text-muted-foreground">Advanced Multi-Modal AI & Enterprise Collaboration</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-gradient-to-r from-primary/10 to-primary-glow/10 text-primary border-primary/20">
              Phase 6 Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Intelligence Core
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Collaboration
          </TabsTrigger>
          <TabsTrigger value="ux" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Advanced UX
          </TabsTrigger>
          <TabsTrigger value="enterprise" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Enterprise
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="validation" className="space-y-6">
          <Phase6ValidationDashboard userId={userId} />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <Phase6IntelligenceCore userId={userId} />
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-6">
          <Phase6CollaborationHub userId={userId} />
        </TabsContent>

        <TabsContent value="ux" className="space-y-6">
          <Phase6AdvancedUX userId={userId} />
        </TabsContent>

        <TabsContent value="enterprise" className="space-y-6">
          <Phase6EnterpriseFeatures userId={userId} />
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Phase6ProductionOptimization userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { TrustIntelligencePanel } from './TrustIntelligencePanel';

interface Phase7DashboardProps {
  userId: string;
}

export function Phase7Dashboard({ userId }: Phase7DashboardProps) {
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Phase 7: Trust Intelligence</h1>
              <p className="text-muted-foreground">Real-time trust metrics and user confidence analytics</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-gradient-to-r from-primary/10 to-primary-glow/10 text-primary border-primary/20">
              Trust Analytics Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Phase 6 Connection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Phase 6 Foundation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Enterprise Intelligence</p>
                <p className="text-xs text-muted-foreground">Multi-modal AI systems active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Collaboration Hub</p>
                <p className="text-xs text-muted-foreground">Partner integrations enabled</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Shield className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Production Ready</p>
                <p className="text-xs text-muted-foreground">System optimization complete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Trust Intelligence Panel */}
      <TrustIntelligencePanel />

      {/* Future Features Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg border-dashed border-muted-foreground/20">
              <h4 className="font-medium text-sm mb-2">Trust Badge Sharing</h4>
              <p className="text-xs text-muted-foreground">Share verified trust metrics via LinkedIn and professional networks</p>
            </div>
            <div className="p-4 border rounded-lg border-dashed border-muted-foreground/20">
              <h4 className="font-medium text-sm mb-2">Feedback Heatmaps</h4>
              <p className="text-xs text-muted-foreground">Visual analytics of user satisfaction patterns and improvement areas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
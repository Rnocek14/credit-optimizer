import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Target, Clock, DollarSign } from 'lucide-react';
import { PivotProgressTracker } from './PivotProgressTracker';
import { ROISimulationEngine } from './ROISimulationEngine';
import { PivotTimelineAdjustor } from './PivotTimelineAdjustor';
import { OutcomePredictor } from './OutcomePredictor';

interface PivotOutcomeTrackerProps {
  userId: string;
  activePivots?: any[];
}

export function PivotOutcomeTracker({ userId, activePivots = [] }: PivotOutcomeTrackerProps) {
  const [activeTab, setActiveTab] = useState('progress');

  // Mock active pivot data
  const currentPivot = activePivots[0] || {
    id: '1',
    targetCareer: 'Product Manager',
    currentProgress: 65,
    roi_score: 85,
    estimated_cost: '$1200',
    estimated_time: '4 months'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pivot Outcome Tracker</h1>
              <p className="text-muted-foreground">
                Monitor progress, ROI simulation, and timeline optimization
              </p>
            </div>
            <Badge variant="outline" className="ml-auto bg-gradient-to-r from-primary/10 to-accent/10">
              Phase 4.4 Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tracking Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Progress Tracker
          </TabsTrigger>
          <TabsTrigger value="roi" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            ROI Simulation
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline Adjustor
          </TabsTrigger>
          <TabsTrigger value="predictor" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Outcome Predictor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <PivotProgressTracker userId={userId} activePivots={activePivots} />
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <ROISimulationEngine userId={userId} pivotPath={currentPivot} />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <PivotTimelineAdjustor 
            userId={userId}
            currentProgress={currentPivot.currentProgress}
            originalTimeline={currentPivot.estimated_time}
            targetCareer={currentPivot.targetCareer}
          />
        </TabsContent>

        <TabsContent value="predictor" className="space-y-6">
          <OutcomePredictor 
            userId={userId}
            targetCareer={currentPivot.targetCareer}
            currentProgress={currentPivot.currentProgress}
            pivotData={currentPivot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartGoalOptimizer } from './SmartGoalOptimizer';
import { IntelligentLearningPathManager } from './IntelligentLearningPathManager';
import { MayaGoalAssistant } from './MayaGoalAssistant';
import { GoalTracker } from './GoalTracker';
import { Brain, Route, MessageCircle, Target } from 'lucide-react';

interface EnhancedGoalDashboardProps {
  userId: string;
}

export function EnhancedGoalDashboard({ userId }: EnhancedGoalDashboardProps) {
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tracker');

  const handleGoalSelection = (goal: any, targetTab?: string) => {
    console.log('🎯 Enhanced Goal Dashboard received goal:', goal);
    console.log('🎯 Goal ID being set:', goal?.id);
    setSelectedGoal(goal);
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Phase 3: AI-Driven Goal Intelligence
          </CardTitle>
          <CardDescription>
            Advanced AI-powered goal optimization, learning paths, and autonomous assistance
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Optimizer
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Learning Paths
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Maya Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker">
          <GoalTracker 
            userId={userId} 
            onGoalSelect={handleGoalSelection}
            selectedGoal={selectedGoal}
          />
        </TabsContent>

        <TabsContent value="optimizer">
          {selectedGoal ? (
            <SmartGoalOptimizer
              goalId={selectedGoal.id}
              userId={userId}
              goal={selectedGoal}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Select a goal from the Goals tab to optimize it with AI.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paths">
          {selectedGoal ? (
            <IntelligentLearningPathManager
              goalId={selectedGoal.id}
              userId={userId}
              goal={selectedGoal}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Select a goal to generate intelligent learning paths.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assistant">
          {selectedGoal ? (
            <div className="relative h-[600px]">
              <MayaGoalAssistant
                goalId={selectedGoal.id}
                userId={userId}
                goal={selectedGoal}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Select a goal to chat with Maya about it.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
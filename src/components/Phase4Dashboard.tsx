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
import { EnhancedPivotAdvisor } from './EnhancedPivotAdvisor';
import { CrossPathComparisonPanel } from './CrossPathComparisonPanel';
import { SmartPivotRecommendations } from './SmartPivotRecommendations';
import { PivotOutcomeTracker } from './PivotOutcomeTracker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Phase4DashboardProps {
  userId: string;
}

export function Phase4Dashboard({ userId }: Phase4DashboardProps) {
  const [activeTab, setActiveTab] = useState('copilot');
  const [selectedPivotPath, setSelectedPivotPath] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useUserProfile(userId);
  const { toast } = useToast();

  const handleGenerateRoadmap = (path: any) => {
    toast({
      title: "Generating roadmap...",
      description: `Creating personalized plan for ${path.name || path.new_career}`,
      variant: "default"
    });
    
    navigate('/planner', { 
      state: { 
        targetRole: path.name || path.new_career,
        pivotData: path 
      }
    });
  };

  const handleSelectPivot = (pivotPath: any) => {
    toast({
      title: "Pivot path selected",
      description: `Analyzing ${pivotPath.new_career} career transition`,
      variant: "default"
    });
    
    setSelectedPivotPath(pivotPath);
    setShowComparison(true);
  };

  const handleViewDetails = (pivotPath: any) => {
    toast({
      title: "Opening detailed analysis",
      description: `Viewing Maya's insights for ${pivotPath.new_career}`,
      variant: "default"
    });
    
    navigate('/maya-roadmap', {
      state: {
        pivotPath,
        currentRole: profile?.current_role,
        userSkills: profile?.skills
      }
    });
  };

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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="copilot" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Co-Pilot Hub
          </TabsTrigger>
          <TabsTrigger value="pivot" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Pivot Intelligence
          </TabsTrigger>
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Progress Tracker
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
          {profileLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3">Loading your profile...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CareerTransitionSimulator userId={userId} />
              <div className="space-y-6">
                <MayaAutonomousIntelligence />
                <CareerReadinessMonitor userId={userId} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pivot" className="space-y-6">
          {showComparison ? (
            <CrossPathComparisonPanel
              userId={userId}
              pivotPath={selectedPivotPath}
              onGenerateRoadmap={handleGenerateRoadmap}
              onClose={() => {
                setShowComparison(false);
                setSelectedPivotPath(null);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <EnhancedPivotAdvisor
                  userId={userId}
                  currentRole={profile?.current_role}
                  userSkills={profile?.skills}
                  onViewComparison={handleSelectPivot}
                />
              </div>
              <div>
                <SmartPivotRecommendations
                  userId={userId}
                  currentRole={profile?.current_role}
                  userSkills={profile?.skills}
                  onSelectPivot={handleSelectPivot}
                  onViewDetails={handleViewDetails}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracker" className="space-y-6">
          <PivotOutcomeTracker userId={userId} />
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
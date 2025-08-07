import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import { Phase4Sidebar } from './enhanced/Phase4Sidebar';
import { Phase4Overview } from './enhanced/Phase4Overview';
import { TimelineProgressTracker } from './enhanced/TimelineProgressTracker';
import { LoadingFallback } from './enhanced/LoadingFallback';
import { WorkflowActionHandler } from './enhanced/WorkflowActionHandler';
import { SharedDataProvider } from './enhanced/SharedDataProvider';
import { EnhancedErrorBoundary } from './enhanced/EnhancedErrorBoundary';
import { AutonomousWorkflowDashboard } from './AutonomousWorkflowDashboard';
import { PredictiveAnalyticsEngine } from './PredictiveAnalyticsEngine';
import { MayaAutonomousIntelligence } from './MayaAutonomousIntelligence';
import { CareerReadinessMonitor } from './CareerReadinessMonitor';
import { EnhancedWorkflowEngine } from './EnhancedWorkflowEngine';
import { RealTimeMarketIntelligence } from './RealTimeMarketIntelligence';
import { CareerTransitionSimulator } from './CareerTransitionSimulator';
import { EnhancedPivotAdvisor } from './EnhancedPivotAdvisor';
import { MayaCareerCopilot } from './maya/MayaCareerCopilot';
import { MayaTimelineInsights } from './maya/MayaTimelineInsights';
import { MayaWorkflowEngine } from './maya/MayaWorkflowEngine';
import { CrossPathComparisonPanel } from './CrossPathComparisonPanel';
import { SmartPivotRecommendations } from './SmartPivotRecommendations';
import { SmartSuggestionsWidget } from './enhanced/SmartSuggestionsWidget';
import { UnifiedProgressIndicator } from './enhanced/UnifiedProgressIndicator';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePhase4Integration } from '@/hooks/usePhase4Integration';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Phase4DashboardProps {
  userId: string;
}

export function Phase4Dashboard({ userId }: Phase4DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showComparison, setShowComparison] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useUserProfile(userId);
  const { toast } = useToast();
  
  // Enhanced Phase 4 integration with cross-tab synchronization
  const {
    sharedState,
    syncPivotSelection,
    userProfile,
    getMayaReasoning,
    getSmartSuggestions,
    isLoading: integrationLoading,
    hasData
  } = usePhase4Integration(userId);

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
    // Use integrated pivot selection that syncs across all components
    syncPivotSelection(pivotPath);
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

  const handleMilestoneAction = (milestoneId: string, action: string) => {
    toast({
      title: `Milestone ${action}`,
      description: `Taking action on milestone: ${milestoneId}`,
      variant: "default"
    });
  };

  // Mock milestone data for the timeline tracker
  const mockMilestones = [
    {
      id: 'm1',
      title: 'Product Strategy Fundamentals',
      description: 'Complete product strategy course and apply learnings to real scenarios',
      progress: 100,
      status: 'completed' as const,
      estimatedCompletion: '2024-07-15',
      actualCompletion: '2024-07-12',
      skills: ['Product Strategy', 'Market Analysis', 'Competitive Intelligence'],
      priority: 'high' as const,
      xpAwarded: 50
    },
    {
      id: 'm2',
      title: 'Analytics & Data Skills',
      description: 'Master analytics tools, SQL, and data interpretation for product decisions',
      progress: 80,
      status: 'in_progress' as const,
      estimatedCompletion: '2024-08-15',
      skills: ['SQL', 'Analytics', 'Data Interpretation'],
      priority: 'high' as const,
      xpAwarded: 0
    },
    {
      id: 'm3',
      title: 'User Research Methods',
      description: 'Learn user research methodologies and interview techniques',
      progress: 30,
      status: 'in_progress' as const,
      estimatedCompletion: '2024-09-15',
      skills: ['User Research', 'Interview Techniques', 'Usability Testing'],
      priority: 'medium' as const,
      xpAwarded: 0
    },
    {
      id: 'm4',
      title: 'Product Launch Project',
      description: 'Complete comprehensive product launch simulation with stakeholder management',
      progress: 0,
      status: 'pending' as const,
      estimatedCompletion: '2024-10-30',
      skills: ['Project Management', 'Launch Strategy', 'Stakeholder Management'],
      priority: 'medium' as const,
      xpAwarded: 0
    }
  ];

  return (
    <EnhancedErrorBoundary>
      <SharedDataProvider userId={userId}>
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <Phase4Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">Phase 4: Autonomous Career Co-Pilot</h1>
                      <p className="text-muted-foreground">AI-Powered Career Transition & Autonomous Workflows</p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
                      Phase 4 Active
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <Phase4Overview
                  userId={userId}
                  sharedState={sharedState}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'copilot' && (
                <LoadingFallback 
                  isLoading={integrationLoading} 
                  hasData={hasData}
                  fallbackMessage="Loading your personalized AI Co-Pilot..."
                >
                  <div className="space-y-6">
                    {/* Main Chat Area */}
                    <div className="w-full">
                      <MayaCareerCopilot userId={userId} />
                    </div>
                    
                    {/* Progress and Insights Layout */}
                    <div className="space-y-6">
                      {/* Top Row - Progress Indicator gets full width */}
                      <div className="w-full">
                        <UnifiedProgressIndicator 
                          data={{
                            pivotProgress: sharedState.progressData?.currentProgress || 0,
                            criScore: 75,
                            roiConfidence: sharedState.selectedPivot?.roi_score || 0,
                            timelineCompletion: 65,
                            skillsAcquired: sharedState.progressData?.skillsAcquired || 0,
                            totalSkills: (sharedState.selectedPivot?.missing_skills?.length || 0) + (sharedState.selectedPivot?.shared_skills?.length || 0),
                            milestonesCompleted: sharedState.progressData?.milestones?.filter((m: any) => m.status === 'completed').length || 0,
                            totalMilestones: sharedState.progressData?.milestones?.length || 0
                          }}
                          selectedPivot={sharedState.selectedPivot}
                        />
                      </div>
                      
                      {/* Bottom Row - Smart Suggestions and Career Readiness side by side */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <SmartSuggestionsWidget 
                            suggestions={getSmartSuggestions()}
                            mayaReasoning={getMayaReasoning('pivot_selection', sharedState.selectedPivot)}
                          />
                        </div>
                        
                        <div>
                          <CareerReadinessMonitor userId={userId} />
                        </div>
                      </div>
                    </div>
                  </div>
                </LoadingFallback>
              )}

              {activeTab === 'pivot' && (
                showComparison ? (
                  <CrossPathComparisonPanel
                    userId={userId}
                    pivotPath={sharedState.selectedPivot}
                    onGenerateRoadmap={handleGenerateRoadmap}
                    onClose={() => {
                      setShowComparison(false);
                    }}
                  />
                ) : (
                  <div className="space-y-6">
                    <SmartPivotRecommendations
                      userId={userId}
                      currentRole={userProfile?.current_role}
                      userSkills={userProfile?.skills}
                      onSelectPivot={handleSelectPivot}
                      onViewDetails={handleViewDetails}
                    />
                    <EnhancedPivotAdvisor
                      userId={userId}
                      currentRole={userProfile?.current_role}
                      userSkills={userProfile?.skills}
                      onViewComparison={handleSelectPivot}
                    />
                    <SmartSuggestionsWidget 
                      suggestions={getSmartSuggestions()}
                      mayaReasoning={getMayaReasoning('pivot_selection', sharedState.selectedPivot)}
                    />
                  </div>
                )
              )}

              {activeTab === 'tracker' && (
                <div className="space-y-6">
                  <MayaTimelineInsights
                    userId={userId}
                    milestones={mockMilestones}
                    targetCareer={sharedState.selectedPivot?.new_career || 'Product Manager'}
                    overallProgress={sharedState.progressData?.currentProgress || 72}
                  />
                  <TimelineProgressTracker
                    targetCareer={sharedState.selectedPivot?.new_career || 'Product Manager'}
                    overallProgress={sharedState.progressData?.currentProgress || 72}
                    milestones={mockMilestones}
                    skillsAcquired={sharedState.progressData?.skillsAcquired || 4}
                    totalSkills={sharedState.progressData?.totalSkills || 7}
                    estimatedCompletion="4 months"
                    onMilestoneAction={handleMilestoneAction}
                  />
                </div>
              )}

              {activeTab === 'workflows' && (
                <div className="space-y-6">
                  <MayaWorkflowEngine userId={userId} />
                  <WorkflowActionHandler userId={userId} workflows={[]} />
                </div>
              )}
            </div>
          </div>
        </div>
      </SharedDataProvider>
    </EnhancedErrorBoundary>
  );
}
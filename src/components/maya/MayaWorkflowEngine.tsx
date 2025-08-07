import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Bot, Zap, Play, Pause, CheckCircle, Clock, AlertCircle, Settings } from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAutonomousWorkflows } from '@/hooks/useAutonomousWorkflows';
import { useToast } from '@/hooks/use-toast';

interface WorkflowItem {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'pending';
  progress: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  category: string;
  mayaRecommended: boolean;
}

interface MayaWorkflowEngineProps {
  userId: string;
}

export function MayaWorkflowEngine({ userId }: MayaWorkflowEngineProps) {
  const { profile: userProfile } = useUserProfile(userId);
  const { sendEnhancedRequest, loading: mayaLoading } = useEnhancedMaya();
  const { 
    workflows: dbWorkflows,
    loading: workflowsLoading,
    fetchUserWorkflows,
    pauseWorkflow,
    resumeWorkflow,
    createWorkflow
  } = useAutonomousWorkflows();
  const { toast } = useToast();
  const [mayaInsights, setMayaInsights] = useState<any>(null);

  // Convert database workflows to display format
  const workflows: WorkflowItem[] = dbWorkflows.map(w => ({
    id: w.id,
    title: w.title,
    description: w.description || '',
    status: mapDatabaseStatus(w.status),
    progress: w.progress_percentage || 0,
    priority: w.priority as 'high' | 'medium' | 'low',
    estimatedTime: w.estimated_duration_days ? `${w.estimated_duration_days} days` : '1-2 days',
    category: w.workflow_type || 'General',
    mayaRecommended: w.workflow_type?.includes('maya') || false
  }));

  // Helper function to map database status to display status
  function mapDatabaseStatus(status: string): 'active' | 'paused' | 'completed' | 'pending' {
    switch (status) {
      case 'active':
      case 'running':
        return 'active';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      case 'planning':
      case 'pending':
      default:
        return 'pending';
    }
  }

  useEffect(() => {
    // Fetch real workflows from database
    fetchUserWorkflows();
  }, [fetchUserWorkflows]);

  useEffect(() => {
    // Get Maya's workflow optimization insights
    const getMayaInsights = async () => {
      if (userProfile && workflows.length > 0) {
        const context = {
          careerPath: userProfile.current_role,
          goals: userProfile.career_goals,
          skillLevel: userProfile.experience_level === 'entry' ? 1 : userProfile.experience_level === 'mid' ? 2 : 3,
          currentWorkflows: workflows.length
        };

        const response = await sendEnhancedRequest(
          "Analyze my current workflows and suggest optimizations for better career progression efficiency.",
          context
        );

        if (response) {
          setMayaInsights(response);
        }
      }
    };

    getMayaInsights();
  }, [userProfile, workflows.length, sendEnhancedRequest]);

  const handleWorkflowAction = async (workflowId: string, action: 'start' | 'pause' | 'resume') => {
    try {
      switch (action) {
        case 'pause':
          await pauseWorkflow(workflowId);
          break;
        case 'resume':
        case 'start':
          await resumeWorkflow(workflowId);
          break;
      }
      
      // Refresh workflows after action
      await fetchUserWorkflows();
      
      toast({
        title: "Workflow Updated",
        description: `Workflow ${action}ed successfully`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} workflow`,
        variant: "destructive"
      });
    }
  };

  const createNewWorkflow = async () => {
    if (!userProfile) return;

    try {
      // Get Maya's suggestion for a new workflow
      const context = {
        careerPath: userProfile.current_role,
        goals: userProfile.career_goals,
        skillLevel: userProfile.experience_level === 'entry' ? 1 : userProfile.experience_level === 'mid' ? 2 : 3
      };

      const mayaResponse = await sendEnhancedRequest(
        "Suggest a new autonomous workflow that would benefit my career progression right now.",
        context
      );

      if (mayaResponse && mayaResponse.autonomousActions?.length > 0) {
        const suggestion = mayaResponse.autonomousActions[0];
        
        // Create workflow using the database
        const customization = {
          title: suggestion.action || 'Maya Recommended Workflow',
          description: suggestion.reasoning || 'AI-generated workflow for career progression',
          targetOutcome: suggestion.outcome || 'Improve career readiness',
          priority: 'medium',
          context: context
        };

        await createWorkflow('maya_suggested', customization);
        
        toast({
          title: "New Workflow Created",
          description: "Maya has created a new workflow for you",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new workflow",
        variant: "destructive"
      });
    }
  };

  const activeWorkflows = workflows.filter(w => w.status === 'active');
  const completedWorkflows = workflows.filter(w => w.status === 'completed');
  const mayaRecommendedWorkflows = workflows.filter(w => w.mayaRecommended);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 text-red-700 bg-red-50';
      case 'medium':
        return 'border-yellow-300 text-yellow-700 bg-yellow-50';
      case 'low':
        return 'border-gray-300 text-gray-700 bg-gray-50';
      default:
        return 'border-gray-300 text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Maya Workflow Engine Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Maya Workflow Engine</h3>
              <p className="text-sm text-muted-foreground">AI-powered autonomous task management</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={createNewWorkflow} disabled={mayaLoading || workflowsLoading}>
                <Zap className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeWorkflows.length}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedWorkflows.length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{mayaRecommendedWorkflows.length}</div>
              <div className="text-sm text-muted-foreground">Maya Suggested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(workflows.reduce((acc, w) => acc + w.progress, 0) / workflows.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Workflows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-green-600" />
              Active Workflows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowsLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading workflows...</p>
              </div>
            ) : activeWorkflows.length > 0 ? (
              activeWorkflows.map((workflow) => (
                <div key={workflow.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(workflow.status)}
                        <h4 className="font-medium text-sm">{workflow.title}</h4>
                        {workflow.mayaRecommended && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Maya
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{workflow.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{workflow.category}</span>
                        <span>Est: {workflow.estimatedTime}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(workflow.priority)}`}>
                      {workflow.priority}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Progress</span>
                      <span className="text-xs text-muted-foreground">{workflow.progress}%</span>
                    </div>
                    <Progress value={workflow.progress} className="h-2" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWorkflowAction(workflow.id, 'pause')}
                      disabled={workflowsLoading}
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Configure
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active workflows</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={createNewWorkflow} disabled={workflowsLoading}>
                  Create Your First Workflow
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maya Optimization Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4 text-purple-600" />
              Maya's Workflow Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mayaInsights ? (
              <>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <p className="text-sm text-purple-900 dark:text-purple-100 mb-2">
                    {mayaInsights.response}
                  </p>
                </div>

                {mayaInsights.autonomousActions?.slice(0, 3).map((action: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{action.reasoning}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="w-full" onClick={createNewWorkflow}>
                  <Bot className="w-3 h-3 mr-1" />
                  Implement Maya's Suggestions
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Maya is analyzing your workflows...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Workflows Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(workflow.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{workflow.title}</span>
                      {workflow.mayaRecommended && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Maya
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{workflow.category}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{workflow.progress}%</div>
                    <div className="text-xs text-muted-foreground">{workflow.status}</div>
                  </div>
                  
                  {workflow.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWorkflowAction(workflow.id, 'start')}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  )}
                  
                  {workflow.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWorkflowAction(workflow.id, 'resume')}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutonomousWorkflows } from '@/hooks/useAutonomousWorkflows';
import { WorkflowStepExecutor } from './WorkflowStepExecutor';
import { WorkflowProgressTracker } from './WorkflowProgressTracker';
import { PlayCircle, PauseCircle, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import TutorialTip from '@/tutorial/TutorialTip';

export function EnhancedWorkflowDashboard() {
  const { 
    workflows, 
    loading, 
    executeStep, 
    pauseWorkflow, 
    resumeWorkflow,
    getActiveWorkflows,
    getCompletedWorkflows,
    getNextStepsForUser,
    fetchUserWorkflows
  } = useAutonomousWorkflows();

  // Auto-fetch on mount
  useEffect(() => {
    fetchUserWorkflows();
  }, [fetchUserWorkflows]);

  const [executingStep, setExecutingStep] = useState<string | null>(null);

  const activeWorkflows = getActiveWorkflows();
  const completedWorkflows = getCompletedWorkflows();
  const nextSteps = getNextStepsForUser();

  const handleExecuteStep = async (stepId: string) => {
    setExecutingStep(stepId);
    try {
      await executeStep(stepId);
    } finally {
      setExecutingStep(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="w-4 h-4 text-green-500" />;
      case 'paused': return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading Maya's Autonomous Workflows...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Maya's Autonomous Workflow Engine - Phase 6
          </CardTitle>
          <CardDescription>
            Intelligent career development workflows that adapt and execute automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{activeWorkflows.length}</div>
              <div className="text-sm text-blue-600">Active Workflows</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completedWorkflows.length}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{nextSteps.length}</div>
              <div className="text-sm text-orange-600">Ready Steps</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="next-steps">Next Actions</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeWorkflows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active workflows found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Use the "Force Workflow Test" button above to create autonomous workflows
                </p>
              </CardContent>
            </Card>
          ) : (
            activeWorkflows.map((workflow) => (
              <div key={workflow.id} className="space-y-4">
                <WorkflowProgressTracker workflow={workflow} />
                <div className="space-y-3">
                  {workflow.workflow_steps?.map((step) => (
                    <WorkflowStepExecutor 
                      key={step.id} 
                      step={step} 
                      onStepUpdated={fetchUserWorkflows}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="next-steps" className="space-y-4" id="maya-alt-paths">
          <div className="relative">
            <div className="absolute top-2 right-2">
              <TutorialTip
                id="maya_alt_paths"
                label="Explore alternatives when time, budget, or difficulty is a constraint. Maya shows multiple pathways to your goals."
              />
            </div>
            {nextSteps.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No immediate actions required</p>
                  <p className="text-sm text-gray-400 mt-2">Maya will notify you when steps are ready</p>
                </CardContent>
              </Card>
            ) : (
            nextSteps.map((step) => (
              <Card key={step.id} className="w-full">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      <Badge variant="outline" className="mt-2">{step.step_type}</Badge>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleExecuteStep(step.id)}
                      disabled={executingStep === step.id}
                    >
                      {executingStep === step.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          Executing
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedWorkflows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No completed workflows yet</p>
              </CardContent>
            </Card>
          ) : (
            completedWorkflows.map((workflow) => (
              <Card key={workflow.id} className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <CardTitle className="text-lg">{workflow.title}</CardTitle>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p>Completed: {new Date(workflow.completed_at!).toLocaleDateString()}</p>
                    <p>Duration: {workflow.estimated_duration_days} days</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
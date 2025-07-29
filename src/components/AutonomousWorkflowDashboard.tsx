import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutonomousWorkflows, AutonomousWorkflow, WorkflowStep, WorkflowTemplate } from '@/hooks/useAutonomousWorkflows';
import { Play, Pause, Square, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AutonomousWorkflowDashboard: React.FC = () => {
  const {
    workflows,
    templates,
    loading,
    error,
    fetchUserWorkflows,
    fetchWorkflowTemplates,
    createWorkflow,
    executeStep,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    getActiveWorkflows,
    getCompletedWorkflows,
    getNextStepsForUser
  } = useAutonomousWorkflows();

  const { toast } = useToast();

  useEffect(() => {
    fetchUserWorkflows();
    fetchWorkflowTemplates();
  }, [fetchUserWorkflows, fetchWorkflowTemplates]);

  const handleCreateWorkflow = async (templateName: string) => {
    const customization = {
      target_role: 'Software Engineer',
      location: 'United States',
      timeline: '3 months'
    };
    
    await createWorkflow(templateName, customization);
  };

  const handleExecuteStep = async (stepId: string) => {
    await executeStep(stepId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': case 'in_progress': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'active': case 'in_progress': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const activeWorkflows = getActiveWorkflows();
  const completedWorkflows = getCompletedWorkflows();
  const nextSteps = getNextStepsForUser();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maya Autonomous Workflows</h1>
          <p className="text-muted-foreground">Let Maya orchestrate your career advancement automatically</p>
        </div>
        {nextSteps.length > 0 && (
          <Button 
            onClick={() => handleExecuteStep(nextSteps[0].id)}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Execute Next Step
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedWorkflows.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextSteps.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeWorkflows.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No active workflows. Create one from a template to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeWorkflows.map((workflow) => (
                <WorkflowCard 
                  key={workflow.id} 
                  workflow={workflow}
                  onPause={() => pauseWorkflow(workflow.id)}
                  onResume={() => resumeWorkflow(workflow.id)}
                  onCancel={() => cancelWorkflow(workflow.id)}
                  onExecuteStep={handleExecuteStep}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template}
                onCreate={() => handleCreateWorkflow(template.template_name)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedWorkflows.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No completed workflows yet. Keep working on your active workflows!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedWorkflows.map((workflow) => (
                <WorkflowCard 
                  key={workflow.id} 
                  workflow={workflow}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="next-steps" className="space-y-4">
          {nextSteps.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No pending autonomous steps. All workflows are either completed or waiting for user input.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {nextSteps.map((step) => (
                <Card key={step.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(step.status)}
                        {step.title}
                      </CardTitle>
                      <Button 
                        onClick={() => handleExecuteStep(step.id)}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        Execute
                      </Button>
                    </div>
                    <CardDescription>
                      From: {step.workflow_title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{step.action_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        ~{step.estimated_duration_hours}h
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface WorkflowCardProps {
  workflow: AutonomousWorkflow;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onExecuteStep?: (stepId: string) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onPause,
  onResume,
  onCancel,
  onExecuteStep
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const nextStep = workflow.workflow_steps?.find(step => 
    step.status === 'pending' && step.is_autonomous
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(workflow.status)}
            {workflow.title}
          </CardTitle>
          <Badge className={`${getStatusColor(workflow.status)} text-white`}>
            {workflow.status}
          </Badge>
        </div>
        <CardDescription>{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{workflow.progress_percentage}%</span>
          </div>
          <Progress value={workflow.progress_percentage} className="h-2" />
        </div>

        {workflow.workflow_steps && (
          <div>
            <h4 className="text-sm font-medium mb-2">Steps</h4>
            <div className="space-y-1">
              {workflow.workflow_steps.slice(0, 3).map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(step.status)}`} />
                  <span className={step.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                    {step.title}
                  </span>
                </div>
              ))}
              {workflow.workflow_steps.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{workflow.workflow_steps.length - 3} more steps
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {workflow.status === 'active' && onPause && (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </Button>
          )}
          {workflow.status === 'paused' && onResume && (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="w-3 h-3 mr-1" />
              Resume
            </Button>
          )}
          {nextStep && onExecuteStep && (
            <Button size="sm" onClick={() => onExecuteStep(nextStep.id)}>
              <Zap className="w-3 h-3 mr-1" />
              Next Step
            </Button>
          )}
          {(workflow.status === 'active' || workflow.status === 'paused') && onCancel && (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              <Square className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface TemplateCardProps {
  template: WorkflowTemplate;
  onCreate: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onCreate }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{template.title}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>~{template.estimated_duration_days} days</span>
          <span>Used {template.usage_count} times</span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {Array.isArray(template.template_steps) && template.template_steps.slice(0, 3).map((step, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {step.replace(/_/g, ' ')}
            </Badge>
          ))}
          {Array.isArray(template.template_steps) && template.template_steps.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.template_steps.length - 3} more
            </Badge>
          )}
        </div>

        <Button onClick={onCreate} className="w-full">
          Create Workflow
        </Button>
      </CardContent>
    </Card>
  );
};
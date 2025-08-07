import React from 'react';
import { Play, Pause, Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface WorkflowAction {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'paused';
  progress: number;
  estimatedTime: string;
  category: string;
}

interface WorkflowActionHandlerProps {
  userId: string;
  workflows: WorkflowAction[];
  onWorkflowUpdate?: (workflowId: string, status: string) => void;
}

export function WorkflowActionHandler({ userId, workflows, onWorkflowUpdate }: WorkflowActionHandlerProps) {
  const { toast } = useToast();

  const mockWorkflows: WorkflowAction[] = workflows.length > 0 ? workflows : [
    {
      id: '1',
      title: 'Skill Gap Analysis',
      description: 'Automated assessment of missing skills for career transition',
      status: 'completed',
      progress: 100,
      estimatedTime: '2 hours',
      category: 'Analysis'
    },
    {
      id: '2',
      title: 'Learning Path Generation',
      description: 'AI-generated personalized learning roadmap',
      status: 'running',
      progress: 75,
      estimatedTime: '30 minutes',
      category: 'Planning'
    },
    {
      id: '3',
      title: 'Market Intelligence Sync',
      description: 'Real-time job market data collection and analysis',
      status: 'pending',
      progress: 0,
      estimatedTime: '1 hour',
      category: 'Intelligence'
    },
    {
      id: '4',
      title: 'Portfolio Optimization',
      description: 'Automated review and enhancement of professional portfolio',
      status: 'paused',
      progress: 40,
      estimatedTime: '45 minutes',
      category: 'Optimization'
    }
  ];

  const handleWorkflowAction = (workflowId: string, action: 'start' | 'pause' | 'optimize') => {
    const workflow = mockWorkflows.find(w => w.id === workflowId);
    if (!workflow) return;

    let newStatus: string;
    let message: string;

    switch (action) {
      case 'start':
        newStatus = 'running';
        message = `Started workflow: ${workflow.title}`;
        break;
      case 'pause':
        newStatus = 'paused';
        message = `Paused workflow: ${workflow.title}`;
        break;
      case 'optimize':
        newStatus = 'running';
        message = `Optimizing workflow: ${workflow.title}`;
        break;
      default:
        return;
    }

    // Update workflow status
    onWorkflowUpdate?.(workflowId, newStatus);

    toast({
      title: "Workflow Updated",
      description: message,
      variant: "default"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'running':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="grid gap-4">
      {mockWorkflows.map((workflow) => (
        <Card key={workflow.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(workflow.status)}
                <CardTitle className="text-base">{workflow.title}</CardTitle>
              </div>
              <Badge variant="outline" className={getStatusColor(workflow.status)}>
                {workflow.status}
              </Badge>
            </div>
            <CardDescription>{workflow.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Progress: {workflow.progress}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Est. {workflow.estimatedTime}
                </div>
                <Badge variant="secondary">{workflow.category}</Badge>
              </div>
              <div className="flex gap-2">
                {workflow.status === 'pending' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleWorkflowAction(workflow.id, 'start')}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                )}
                {workflow.status === 'running' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleWorkflowAction(workflow.id, 'pause')}
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </Button>
                )}
                {(workflow.status === 'paused' || workflow.status === 'completed') && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleWorkflowAction(workflow.id, 'optimize')}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Optimize
                  </Button>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all duration-300" 
                  style={{ width: `${workflow.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
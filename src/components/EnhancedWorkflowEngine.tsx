import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, Clock, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  confidence: number;
  estimatedTime: number;
  actualTime?: number;
  output?: any;
}

interface EnhancedWorkflow {
  id: string;
  title: string;
  type: 'skill_development' | 'career_transition' | 'market_analysis';
  status: 'planning' | 'active' | 'paused' | 'completed';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  steps: WorkflowStep[];
  targetOutcome: string;
  estimatedCompletion: Date;
  autonomyLevel: number;
}

export function EnhancedWorkflowEngine() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<EnhancedWorkflow[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    // Initialize with Phase 5 enhanced workflows
    const enhancedWorkflows: EnhancedWorkflow[] = [
      {
        id: '1',
        title: 'AI-Driven Skill Development Plan',
        type: 'skill_development',
        status: 'active',
        progress: 65,
        priority: 'high',
        targetOutcome: 'Achieve 85% CRI score through targeted skill acquisition',
        estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autonomyLevel: 0.85,
        steps: [
          {
            id: 'step1',
            name: 'Market Analysis',
            type: 'analysis',
            status: 'completed',
            confidence: 0.94,
            estimatedTime: 45,
            actualTime: 43,
            output: { demand_score: 92, growth_rate: 15.3, salary_trend: 'increasing' }
          },
          {
            id: 'step2',
            name: 'Skill Gap Assessment',
            type: 'assessment',
            status: 'completed',
            confidence: 0.89,
            estimatedTime: 60,
            actualTime: 58,
            output: { gap_score: 67, priority_skills: ['tensorflow', 'pytorch', 'ml_ops'] }
          },
          {
            id: 'step3',
            name: 'Learning Path Generation',
            type: 'generation',
            status: 'in_progress',
            confidence: 0.91,
            estimatedTime: 30
          },
          {
            id: 'step4',
            name: 'Course Recommendation',
            type: 'recommendation',
            status: 'pending',
            confidence: 0.87,
            estimatedTime: 20
          }
        ]
      },
      {
        id: '2',
        title: 'Real-Time Market Adaptation',
        type: 'market_analysis',
        status: 'planning',
        progress: 0,
        priority: 'medium',
        targetOutcome: 'Adjust career strategy based on emerging market trends',
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        autonomyLevel: 0.92,
        steps: [
          {
            id: 'step1',
            name: 'Market Trend Detection',
            type: 'analysis',
            status: 'pending',
            confidence: 0.88,
            estimatedTime: 15
          },
          {
            id: 'step2',
            name: 'Impact Assessment',
            type: 'assessment',
            status: 'pending',
            confidence: 0.85,
            estimatedTime: 25
          },
          {
            id: 'step3',
            name: 'Strategy Adjustment',
            type: 'optimization',
            status: 'pending',
            confidence: 0.90,
            estimatedTime: 35
          }
        ]
      }
    ];

    setWorkflows(enhancedWorkflows);
  }, []);

  const executeNextStep = async (workflowId: string) => {
    setIsExecuting(true);
    
    try {
      setWorkflows(prev => prev.map(workflow => {
        if (workflow.id === workflowId) {
          const nextStep = workflow.steps.find(step => step.status === 'pending');
          if (nextStep) {
            const updatedSteps = workflow.steps.map(step =>
              step.id === nextStep.id 
                ? { ...step, status: 'in_progress' as const }
                : step
            );
            
            // Simulate step execution
            setTimeout(() => {
              setWorkflows(prev => prev.map(w => {
                if (w.id === workflowId) {
                  const completedSteps = w.steps.map(step =>
                    step.id === nextStep.id
                      ? { 
                          ...step, 
                          status: 'completed' as const,
                          actualTime: Math.floor(step.estimatedTime * (0.8 + Math.random() * 0.4)),
                          output: { success: true, confidence: step.confidence }
                        }
                      : step
                  );
                  
                  const newProgress = Math.round((completedSteps.filter(s => s.status === 'completed').length / completedSteps.length) * 100);
                  
                  return {
                    ...w,
                    steps: completedSteps,
                    progress: newProgress,
                    status: newProgress === 100 ? 'completed' as const : w.status
                  };
                }
                return w;
              }));
              
              toast({
                title: "Step Completed",
                description: `${nextStep.name} executed successfully with ${Math.round(nextStep.confidence * 100)}% confidence`,
              });
            }, 2000);
            
            return {
              ...workflow,
              steps: updatedSteps
            };
          }
        }
        return workflow;
      }));
    } catch (error) {
      toast({
        title: "Execution Error",
        description: "Failed to execute workflow step",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsExecuting(false), 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'in_progress': return <Zap className="w-4 h-4 text-warning animate-pulse" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    switch (activeTab) {
      case 'active': return workflow.status === 'active';
      case 'planning': return workflow.status === 'planning';
      case 'completed': return workflow.status === 'completed';
      default: return true;
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Enhanced Workflow Engine</h2>
              <p className="text-sm text-muted-foreground">Phase 5: Autonomous AI-Driven Career Optimization</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-gradient-to-r from-primary/10 to-accent/10">
              {workflows.filter(w => w.status === 'active').length} Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active ({workflows.filter(w => w.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="planning">Planning ({workflows.filter(w => w.status === 'planning').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({workflows.filter(w => w.status === 'completed').length})</TabsTrigger>
          <TabsTrigger value="all">All ({workflows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No workflows in this category yet.
                  <br />
                  Maya will automatically create workflows based on your goals and market changes.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredWorkflows.map(workflow => (
              <Card key={workflow.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{workflow.title}</h3>
                        <Badge variant={getPriorityColor(workflow.priority)}>
                          {workflow.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(workflow.autonomyLevel * 100)}% Autonomous
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{workflow.targetOutcome}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Type: {workflow.type.replace('_', ' ')}</span>
                        <span>ETA: {workflow.estimatedCompletion.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(workflow.status)}
                      <span className="text-sm capitalize">{workflow.status}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">{workflow.progress}%</span>
                    </div>
                    <Progress value={workflow.progress} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Workflow Steps</h4>
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {step.type} • {step.estimatedTime}min • {Math.round(step.confidence * 100)}% confidence
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(step.status)}
                          {step.actualTime && (
                            <span className="text-xs text-muted-foreground">
                              {step.actualTime}min
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {workflow.status === 'active' && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeNextStep(workflow.id)}
                        disabled={isExecuting || !workflow.steps.some(s => s.status === 'pending')}
                        className="flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        {isExecuting ? 'Executing...' : 'Execute Next Step'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
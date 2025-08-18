import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useMayaWorkflowExecution } from '@/hooks/useMayaWorkflowExecution';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  Brain, 
  Target,
  TrendingUp,
  AlertCircle,
  HelpCircle 
} from 'lucide-react';

interface MayaWorkflowListProps {
  userId: string;
}

export function MayaWorkflowList({ userId }: MayaWorkflowListProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  
  const {
    workflows,
    isLoading,
    executeStep,
    isExecuting,
    validateProgress,
    isValidating,
    generateExplanation,
    isGeneratingExplanation,
    explanationData
  } = useMayaWorkflowExecution(userId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'active': return <Play className="h-4 w-4 text-blue-600" />;
      case 'paused': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case 'career_transition': return <Target className="h-5 w-5" />;
      case 'skill_development': return <Brain className="h-5 w-5" />;
      case 'market_analysis': return <TrendingUp className="h-5 w-5" />;
      default: return <Play className="h-5 w-5" />;
    }
  };

  const mockSteps = [
    { id: '1', title: 'Analyze Current Skills', type: 'skill_analysis', status: 'completed' },
    { id: '2', title: 'Identify Skill Gaps', type: 'gap_analysis', status: 'active' },
    { id: '3', title: 'Create Learning Plan', type: 'planning', status: 'pending' },
    { id: '4', title: 'Execute Development', type: 'execution', status: 'pending' },
    { id: '5', title: 'Validate Progress', type: 'validation', status: 'pending' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Active Workflows</h3>
        <Badge variant="outline">
          {workflows.filter(w => w.status === 'active').length} Active
        </Badge>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Workflows Yet</h3>
            <p className="text-muted-foreground">
              Maya will create personalized workflows based on your goals and progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getWorkflowIcon(workflow.workflow_type)}
                  <div>
                    <CardTitle className="text-lg">{workflow.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(workflow.status)}
                  <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
                    {workflow.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {workflow.progress_percentage}%
                    </span>
                  </div>
                  <Progress value={workflow.progress_percentage} className="w-full" />
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedWorkflow(workflow.id)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {getWorkflowIcon(workflow.workflow_type)}
                          {workflow.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Workflow Steps</h4>
                          <div className="space-y-2">
                            {mockSteps.map((step, index) => (
                              <div 
                                key={step.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                                    step.status === 'active' ? 'bg-blue-100 text-blue-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">{step.title}</p>
                                    <p className="text-xs text-muted-foreground">{step.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedStep(step.id);
                                      generateExplanation({
                                        workflowId: workflow.id,
                                        stepId: step.id,
                                        context: { stepType: step.type }
                                      });
                                    }}
                                    disabled={isGeneratingExplanation}
                                  >
                                    <HelpCircle className="h-3 w-3 mr-1" />
                                    Explain
                                  </Button>
                                  {step.status === 'active' && (
                                    <Button
                                      size="sm"
                                      onClick={() => executeStep({
                                        workflowId: workflow.id,
                                        stepId: step.id,
                                        context: { stepType: step.type }
                                      })}
                                      disabled={isExecuting}
                                    >
                                      <Play className="h-3 w-3 mr-1" />
                                      {isExecuting ? 'Executing...' : 'Execute'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {explanationData && selectedStep && (
                          <div className="border rounded-lg p-4 bg-muted/50">
                            <h5 className="font-medium mb-2">Maya's Explanation</h5>
                            <p className="text-sm text-muted-foreground mb-2">
                              {explanationData.explanation}
                            </p>
                            <Separator className="my-2" />
                            <p className="text-xs text-muted-foreground">
                              <strong>Reasoning:</strong> {explanationData.reasoning}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Confidence:</strong> {Math.round(explanationData.confidence * 100)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {workflow.status === 'active' && (
                    <Button
                      size="sm"
                      onClick={() => validateProgress(workflow.id)}
                      disabled={isValidating}
                    >
                      {isValidating ? 'Validating...' : 'Validate Progress'}
                    </Button>
                  )}
                </div>

                {workflow.last_action_at && (
                  <p className="text-xs text-muted-foreground">
                    Last action: {new Date(workflow.last_action_at).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
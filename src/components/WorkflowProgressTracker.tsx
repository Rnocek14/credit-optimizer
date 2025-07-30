import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Play, AlertCircle } from "lucide-react";

interface WorkflowStep {
  id: string;
  title: string;
  status: string;
  step_order: number;
  estimated_duration_hours?: number;
  is_autonomous?: boolean;
}

interface AutonomousWorkflow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  progress_percentage: number;
  estimated_duration_days: number;
  created_at: string;
  target_completion_date: string | null;
  workflow_steps?: WorkflowStep[];
}

interface WorkflowProgressTrackerProps {
  workflow: AutonomousWorkflow;
}

export function WorkflowProgressTracker({ workflow }: WorkflowProgressTrackerProps) {
  const steps = workflow.workflow_steps || [];
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const currentStep = steps.find(step => step.status === 'in_progress') || 
                     steps.find(step => step.status === 'pending');
  
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'planning':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const estimatedCompletion = workflow.target_completion_date 
    ? new Date(workflow.target_completion_date).toLocaleDateString()
    : workflow.estimated_duration_days 
      ? `${workflow.estimated_duration_days} days from start`
      : 'Not specified';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{workflow.title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getWorkflowStatusColor(workflow.status)}>
              {workflow.status}
            </Badge>
            <Badge className={getPriorityColor(workflow.priority)}>
              {workflow.priority}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{workflow.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedSteps} of {totalSteps} steps completed</span>
            <span>Est. completion: {estimatedCompletion}</span>
          </div>
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Play className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Current Step</span>
              <Badge variant="outline" className="text-xs">
                Step {currentStep.step_order}
              </Badge>
            </div>
            <div className="text-sm">{currentStep.title}</div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{currentStep.estimated_duration_hours}h estimated</span>
              <span>{currentStep.is_autonomous ? 'Autonomous' : 'Manual'}</span>
            </div>
          </div>
        )}

        {/* Step Timeline */}
        <div className="space-y-1">
          <div className="text-sm font-medium mb-2">Step Timeline</div>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${step.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">
                        {step.estimated_duration_hours}h
                      </span>
                      {step.is_autonomous && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          Auto
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{completedSteps}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {steps.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {steps.filter(s => s.is_autonomous).length}
            </div>
            <div className="text-xs text-muted-foreground">Autonomous</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
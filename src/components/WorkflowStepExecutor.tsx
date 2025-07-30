import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Play, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { StepExecutionResult } from "./StepExecutionResult";

interface WorkflowStep {
  id: string;
  workflow_id?: string;
  step_order: number;
  step_type?: string;
  action_type: string;
  title: string;
  description?: string;
  status: string;
  is_autonomous?: boolean;
  requires_user_input?: boolean;
  estimated_duration_hours?: number;
  action_config?: any;
  execution_result?: any;
  error_message?: string | null;
  executed_at?: string | null;
}

interface WorkflowStepExecutorProps {
  step: WorkflowStep;
  onStepUpdated: () => void;
}

export function WorkflowStepExecutor({ step, onStepUpdated }: WorkflowStepExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(step.execution_result);
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const executeStep = async () => {
    try {
      setIsExecuting(true);

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'execute_step',
          stepId: step.id,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setExecutionResult(data.execution_result);
        onStepUpdated();
        toast({
          title: "Step Executed Successfully",
          description: `${step.title} completed successfully`,
        });
      } else {
        throw new Error(data.error || 'Execution failed');
      }

    } catch (error) {
      console.error('Step execution error:', error);
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const canExecute = step.status === 'pending' && !isExecuting;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(step.status)}
            <div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {step.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(step.status)}>
              {step.status}
            </Badge>
            <Badge variant="outline">
              {step.is_autonomous ? 'Autonomous' : 'Manual'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {step.step_order} • {step.estimated_duration_hours}h estimated</span>
          <span className="capitalize">{step.action_type.replace('_', ' ')}</span>
        </div>

        {step.status === 'pending' && (
          <Button 
            onClick={executeStep} 
            disabled={!canExecute}
            className="w-full"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute Step
              </>
            )}
          </Button>
        )}

        {(executionResult || step.execution_result) && (
          <StepExecutionResult 
            result={executionResult || step.execution_result}
            actionType={step.action_type}
          />
        )}

        {step.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{step.error_message}</p>
          </div>
        )}

        {step.requires_user_input && step.status === 'pending' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              This step requires your active participation. Click execute to see your personalized guidance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
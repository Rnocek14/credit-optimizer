import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutonomousWorkflows } from '@/hooks/useAutonomousWorkflows';
import { useToast } from '@/hooks/use-toast';

export const ManualStepTest = () => {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { executeStep } = useAutonomousWorkflows();
  const { toast } = useToast();

  const executeStep5 = async () => {
    setExecuting(true);
    try {
      // Execute Step 5 (network_building) for Aisha Khan's workflow
      const stepId = '913d8794-bd5e-4073-b33d-961312fce499';
      const executionResult = await executeStep(stepId);
      
      if (executionResult) {
        setResult(executionResult);
        toast({
          title: "Manual Step Test Complete",
          description: "Step 5 (network_building) executed successfully with user interaction simulation",
        });
      }
    } catch (error) {
      console.error('Error executing manual step test:', error);
      toast({
        title: "Test Failed",
        description: "Failed to execute manual step test",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Manual Step Execution Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This will execute Step 5 (network_building) in Aisha Khan's workflow with simulated user interaction.
          </p>
          <p className="text-sm text-muted-foreground">
            Expected: Step transitions to completed, progress updates to 62.5%, and user notes are logged.
          </p>
        </div>
        
        <Button 
          onClick={executeStep5} 
          disabled={executing}
          className="w-full"
        >
          {executing ? 'Executing Step 5...' : 'Execute Step 5 (Network Building)'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Execution Result:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
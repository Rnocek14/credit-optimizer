import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { supabase } from '@/integrations/supabase/client';
import { Zap, CheckCircle, Clock, AlertTriangle, Play, Pause } from 'lucide-react';

interface AutonomousAction {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  estimated_completion?: string;
}

export function MayaAutonomousActions() {
  const { getResponseInsights, lastResponse } = useEnhancedMaya();
  const [actions, setActions] = useState<AutonomousAction[]>([]);
  const [loading, setLoading] = useState(false);

  const insights = getResponseInsights();

  useEffect(() => {
    fetchAutonomousActions();
  }, [lastResponse]);

  const fetchAutonomousActions = async () => {
    try {
      setLoading(true);
      const userId = '2b458624-d498-4cca-a63d-9341cc20e363'; // Demo user

      const { data: workflows } = await supabase
        .from('autonomous_workflows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (workflows) {
        const formattedActions: AutonomousAction[] = workflows.map(workflow => ({
          id: workflow.id,
          type: workflow.workflow_type || 'workflow',
          title: workflow.title || 'Autonomous Workflow',
          description: workflow.description || 'Processing workflow steps...',
          status: workflow.status as any,
          progress: workflow.progress_percentage || 0,
          created_at: workflow.created_at,
          estimated_completion: workflow.created_at // Use created_at as fallback
        }));

        setActions(formattedActions);
      }
    } catch (error) {
      console.error('Error fetching autonomous actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'execute_workflow_step',
          workflowId: actionId,
          userId: '2b458624-d498-4cca-a63d-9341cc20e363'
        }
      });

      if (!error) {
        fetchAutonomousActions(); // Refresh actions
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const pauseAction = async (actionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'pause_workflow',
          workflowId: actionId,
          userId: '2b458624-d498-4cca-a63d-9341cc20e363'
        }
      });

      if (!error) {
        fetchAutonomousActions(); // Refresh actions
      }
    } catch (error) {
      console.error('Error pausing action:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Maya Autonomous Actions
          {insights && (
            <Badge variant="outline" className="ml-auto">
              {insights.autonomousActionsCount} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {insights && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{actions.filter(a => a.status === 'completed').length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{actions.filter(a => a.status === 'in_progress').length}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">{actions.filter(a => a.status === 'pending').length}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{actions.filter(a => a.status === 'failed').length}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        )}

        {/* Active Actions */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading autonomous actions...
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No autonomous actions yet</p>
              <p className="text-sm text-muted-foreground">
                Maya will create workflows automatically based on your requests
              </p>
            </div>
          ) : (
            actions.map((action) => (
              <Card key={action.id} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(action.status)}
                        <h4 className="font-medium">{action.title}</h4>
                        <Badge className={getStatusColor(action.status)}>
                          {action.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(action.created_at).toLocaleDateString()}</span>
                        {action.estimated_completion && (
                          <span>ETA: {new Date(action.estimated_completion).toLocaleDateString()}</span>
                        )}
                      </div>
                      
                      {action.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{action.progress}%</span>
                          </div>
                          <Progress value={action.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {action.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeAction(action.id)}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      {action.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseAction(action.id)}
                        >
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
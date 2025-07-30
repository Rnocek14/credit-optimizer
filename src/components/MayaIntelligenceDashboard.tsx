import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutonomousWorkflows } from '@/hooks/useAutonomousWorkflows';
import { MayaDecisionFeedback } from '@/components/MayaDecisionFeedback';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Sparkles,
  Target,
  Zap,
  Activity,
  ThumbsUp,
  Users
} from 'lucide-react';

interface MayaDecision {
  id: string;
  user_id: string;
  workflow_id?: string;
  step_id?: string;
  decision_type: string;
  decision_context: any;
  decision_rationale: string;
  confidence_score: number;
  execution_result?: any;
  user_feedback_rating?: number;
  user_feedback?: string;
  created_at: string;
}

interface MayaAnalytics {
  totalDecisions: number;
  avgConfidenceScore: number;
  successRate: number;
  autonomousSteps: number;
  completedWorkflows: number;
  decisionsByType: Record<string, number>;
  avgUserRating: number;
  feedbackCount: number;
  satisfactionRate: number;
}

export function MayaIntelligenceDashboard() {
  const { 
    workflows, 
    loading: workflowsLoading,
    fetchUserWorkflows,
    getActiveWorkflows,
    getCompletedWorkflows 
  } = useAutonomousWorkflows();

  const [mayaDecisions, setMayaDecisions] = useState<MayaDecision[]>([]);
  const [analytics, setAnalytics] = useState<MayaAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserWorkflows();
    fetchMayaDecisions();
    
    // Set up real-time subscription for Maya decisions
    const channel = supabase
      .channel('maya-decisions-feed')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'maya_decisions' 
      }, (payload) => {
        console.log('New Maya decision received:', payload.new);
        setMayaDecisions(prev => [payload.new as MayaDecision, ...prev.slice(0, 49)]);
        // Recalculate analytics with updated data
        fetchMayaDecisions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUserWorkflows]);

  const fetchMayaDecisions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('maya_decisions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setMayaDecisions(data || []);
      calculateAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching Maya decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (decisions: MayaDecision[]) => {
    const decisionsWithRating = decisions.filter(d => d.user_feedback_rating);
    const analytics: MayaAnalytics = {
      totalDecisions: decisions.length,
      avgConfidenceScore: decisions.length > 0 
        ? decisions.reduce((sum, d) => sum + d.confidence_score, 0) / decisions.length 
        : 0,
      successRate: decisions.length > 0 
        ? (decisions.filter(d => d.execution_result && !d.execution_result.error).length / decisions.length) * 100
        : 0,
      autonomousSteps: decisions.filter(d => d.decision_type === 'step_execution').length,
      completedWorkflows: getCompletedWorkflows().length,
      decisionsByType: decisions.reduce((acc, d) => {
        acc[d.decision_type] = (acc[d.decision_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avgUserRating: decisionsWithRating.length > 0
        ? decisionsWithRating.reduce((sum, d) => sum + (d.user_feedback_rating || 0), 0) / decisionsWithRating.length
        : 0,
      feedbackCount: decisionsWithRating.length,
      satisfactionRate: decisionsWithRating.length > 0
        ? (decisionsWithRating.filter(d => (d.user_feedback_rating || 0) >= 4).length / decisionsWithRating.length) * 100
        : 0
    };

    setAnalytics(analytics);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportMayaReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      analytics,
      recentDecisions: mayaDecisions.slice(0, 10),
      workflows: workflows.map(w => ({
        title: w.title,
        status: w.status,
        progress: w.progress_percentage,
        steps: w.workflow_steps?.length || 0
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maya-intelligence-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (workflowsLoading || loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading Maya Intelligence...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            Maya Intelligence Dashboard
          </CardTitle>
          <CardDescription>
            AI decision analysis, confidence tracking, and autonomous workflow insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{analytics?.totalDecisions || 0}</div>
              <div className="text-sm text-purple-600">Total Decisions</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {analytics?.avgConfidenceScore ? (analytics.avgConfidenceScore * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-green-600">Avg Confidence</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {analytics?.successRate ? analytics.successRate.toFixed(1) : 0}%
              </div>
              <div className="text-sm text-blue-600">Success Rate</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{analytics?.autonomousSteps || 0}</div>
              <div className="text-sm text-orange-600">Autonomous Steps</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ThumbsUp className="w-4 h-4 text-yellow-600" />
                <div className="text-2xl font-bold text-yellow-600">
                  {analytics?.avgUserRating ? analytics.avgUserRating.toFixed(1) : '0.0'}
                </div>
              </div>
              <div className="text-sm text-yellow-600">User Rating</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={exportMayaReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="decisions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="decisions">Maya Decisions</TabsTrigger>
          <TabsTrigger value="workflows">Enhanced Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Maya Decision Timeline
              </CardTitle>
              <CardDescription>
                Real-time AI decision tracking with confidence scores and rationale
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mayaDecisions.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No Maya decisions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mayaDecisions.map((decision) => (
                    <div key={decision.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span className="font-medium text-sm">{decision.decision_type.replace('_', ' ').toUpperCase()}</span>
                          <Badge className={`text-xs ${getConfidenceColor(decision.confidence_score)}`}>
                            {(decision.confidence_score * 100).toFixed(1)}% confident
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">{formatTimestamp(decision.created_at)}</span>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Rationale:</strong> {decision.decision_rationale}
                      </div>
                      
                      {decision.execution_result && (
                        <div className="text-xs bg-gray-100 rounded p-2">
                          <strong>Result:</strong> {JSON.stringify(decision.execution_result, null, 2)}
                        </div>
                      )}
                      
                      <MayaDecisionFeedback
                        decisionId={decision.id}
                        currentRating={decision.user_feedback_rating || 0}
                        currentFeedback={decision.user_feedback || ''}
                        onFeedbackUpdate={fetchMayaDecisions}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Enhanced Workflow Cards
              </CardTitle>
              <CardDescription>
                Workflows enhanced with Maya intelligence and confidence tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No workflows found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflows.map((workflow) => {
                    const workflowDecisions = mayaDecisions.filter(d => d.workflow_id === workflow.id);
                    const avgConfidence = workflowDecisions.length > 0
                      ? workflowDecisions.reduce((sum, d) => sum + d.confidence_score, 0) / workflowDecisions.length
                      : 0;
                    
                    return (
                      <Card key={workflow.id} className="border-l-4 border-l-purple-500">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{workflow.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Maya: {(avgConfidence * 100).toFixed(1)}%
                              </Badge>
                              <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
                                {workflow.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span className="font-medium">{workflow.progress_percentage}%</span>
                            </div>
                            <Progress value={workflow.progress_percentage} className="h-2" />
                            
                            <div className="grid grid-cols-3 gap-3 text-center text-xs">
                              <div>
                                <div className="font-semibold text-purple-600">{workflowDecisions.length}</div>
                                <div className="text-gray-500">Maya Decisions</div>
                              </div>
                              <div>
                                <div className="font-semibold text-blue-600">
                                  {workflow.workflow_steps?.filter(s => s.is_autonomous).length || 0}
                                </div>
                                <div className="text-gray-500">Autonomous Steps</div>
                              </div>
                              <div>
                                <div className="font-semibold text-green-600">
                                  {workflow.workflow_steps?.filter(s => s.status === 'completed').length || 0}
                                </div>
                                <div className="text-gray-500">Completed</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Decision Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.decisionsByType && Object.keys(analytics.decisionsByType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.decisionsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${(count / analytics.totalDecisions) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No decision analytics available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Confidence</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(analytics?.avgConfidenceScore || 0) * 100} className="w-20 h-2" />
                      <span className="text-sm font-medium">
                        {analytics?.avgConfidenceScore ? (analytics.avgConfidenceScore * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={analytics?.successRate || 0} className="w-20 h-2" />
                      <span className="text-sm font-medium">
                        {analytics?.successRate ? analytics.successRate.toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  
                   <div className="flex items-center justify-between">
                     <span className="text-sm">User Satisfaction</span>
                     <div className="flex items-center gap-2">
                       <Progress value={analytics?.satisfactionRate || 0} className="w-20 h-2" />
                       <span className="text-sm font-medium">
                         {analytics?.satisfactionRate ? analytics.satisfactionRate.toFixed(1) : 0}%
                       </span>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <span className="text-sm">Automation Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={analytics?.totalDecisions ? (analytics.autonomousSteps / analytics.totalDecisions) * 100 : 0} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm font-medium">
                        {analytics?.totalDecisions ? ((analytics.autonomousSteps / analytics.totalDecisions) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
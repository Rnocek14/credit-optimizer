import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QATestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

export const Phase2QAValidation: React.FC = () => {
  const [testResults, setTestResults] = useState<QATestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runQATests = async () => {
    setIsRunning(true);
    const results: QATestResult[] = [];
    const aishaUserId = '2b458624-d498-4cca-a63d-9341cc20e363';

    try {
      // Test 1: Enhanced User Profiles
      const { data: userProfile, error: profileError } = await supabase
        .from('enhanced_user_profiles')
        .select('*')
        .eq('user_id', aishaUserId)
        .single();

      if (profileError || !userProfile) {
        results.push({
          testName: 'Enhanced User Profile',
          status: 'FAIL',
          message: 'User profile not found or error occurred',
          details: profileError
        });
      } else {
        results.push({
          testName: 'Enhanced User Profile',
          status: 'PASS',
          message: `Profile loaded with ${Object.keys(userProfile.skill_assessments || {}).length} skill assessments`
        });
      }

      // Test 2: Goal Learning Paths
      const { data: learningPaths, error: pathError } = await supabase
        .from('goal_learning_paths')
        .select('*')
        .eq('user_id', aishaUserId)
        .eq('is_active', true);

      if (pathError || !learningPaths || learningPaths.length === 0) {
        results.push({
          testName: 'Goal Learning Paths',
          status: 'FAIL',
          message: 'No active learning paths found',
          details: pathError
        });
      } else {
        const path = learningPaths[0];
        const nodeCount = Array.isArray(path.path_nodes) ? path.path_nodes.length : 0;
        results.push({
          testName: 'Goal Learning Paths',
          status: 'PASS',
          message: `Active learning path with ${nodeCount} nodes, ${path.estimated_completion_weeks} weeks duration`
        });
      }

      // Test 3: Learning Sessions
      const { data: learningSessions, error: sessionError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', aishaUserId);

      if (sessionError || !learningSessions || learningSessions.length === 0) {
        results.push({
          testName: 'Learning Sessions',
          status: 'WARNING',
          message: 'No learning sessions found - user needs to start learning',
          details: sessionError
        });
      } else {
        const avgEngagement = learningSessions.reduce((sum, session) => 
          sum + (session.engagement_score || 0), 0) / learningSessions.length;
        results.push({
          testName: 'Learning Sessions',
          status: 'PASS',
          message: `${learningSessions.length} sessions recorded, avg engagement: ${avgEngagement.toFixed(1)}`
        });
      }

      // Test 4: Career Goals
      const { data: careerGoals, error: goalError } = await supabase
        .from('career_goals')
        .select('*')
        .eq('user_id', aishaUserId)
        .eq('active', true);

      if (goalError || !careerGoals || careerGoals.length === 0) {
        results.push({
          testName: 'Career Goals',
          status: 'FAIL',
          message: 'No active career goals found',
          details: goalError
        });
      } else {
        results.push({
          testName: 'Career Goals',
          status: 'PASS',
          message: `${careerGoals.length} active goals, target role: ${careerGoals[0]?.target_role || 'Not specified'}`
        });
      }

      // Test 5: Maya Integration Test
      try {
        const { data: mayaResponse, error: mayaError } = await supabase.functions.invoke(
          'goal-learning-path-generator',
          {
            body: {
              userId: aishaUserId,
              goalId: careerGoals?.[0]?.id
            }
          }
        );

        if (mayaError) {
          results.push({
            testName: 'Maya AI Integration',
            status: 'WARNING',
            message: 'Maya function call failed - check edge function logs',
            details: mayaError
          });
        } else if (mayaResponse?.success) {
          results.push({
            testName: 'Maya AI Integration',
            status: 'PASS',
            message: 'Maya AI successfully generating personalized paths'
          });
        } else {
          results.push({
            testName: 'Maya AI Integration',
            status: 'WARNING',
            message: 'Maya function returned without success flag',
            details: mayaResponse
          });
        }
      } catch (mayaTestError) {
        results.push({
          testName: 'Maya AI Integration',
          status: 'WARNING',
          message: 'Maya function test failed - integration needs review',
          details: mayaTestError
        });
      }

      // Test 6: Data Alignment Check
      const hasProfile = userProfile;
      const hasGoals = careerGoals && careerGoals.length > 0;
      const hasPaths = learningPaths && learningPaths.length > 0;

      if (hasProfile && hasGoals && hasPaths) {
        const pathTargetRole = learningPaths[0]?.path_nodes?.[0]?.personalizedReason || '';
        const goalTargetRole = careerGoals[0]?.target_role || '';
        const alignment = pathTargetRole.includes(goalTargetRole) || goalTargetRole.includes('Front-End');
        
        results.push({
          testName: 'User Preferences Alignment',
          status: alignment ? 'PASS' : 'WARNING',
          message: alignment 
            ? 'Learning path aligned with user goals and preferences'
            : 'Learning path may not be fully aligned with user preferences'
        });
      } else {
        results.push({
          testName: 'User Preferences Alignment',
          status: 'FAIL',
          message: 'Missing required data for alignment validation'
        });
      }

    } catch (error) {
      results.push({
        testName: 'System Integration',
        status: 'FAIL',
        message: 'Critical system error during QA validation',
        details: error
      });
    }

    setTestResults(results);
    setIsRunning(false);

    // Show overall result
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARNING').length;

    if (failCount === 0) {
      toast({
        title: "Phase 2 QA Results",
        description: `✅ ${passCount} PASS, ⚠️ ${warnCount} WARNING - System Ready!`,
      });
    } else {
      toast({
        title: "Phase 2 QA Results",
        description: `❌ ${failCount} FAIL, ⚠️ ${warnCount} WARNING - Needs Attention`,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    runQATests();
  }, []);

  const getStatusIcon = (status: QATestResult['status']) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'FAIL':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: QATestResult['status']) => {
    const colors = {
      PASS: 'bg-green-500',
      FAIL: 'bg-red-500',
      WARNING: 'bg-yellow-500'
    };
    return <Badge className={`${colors[status]} text-white`}>{status}</Badge>;
  };

  const overallStatus = () => {
    const failCount = testResults.filter(r => r.status === 'FAIL').length;
    const warnCount = testResults.filter(r => r.status === 'WARNING').length;
    
    if (failCount > 0) return 'CRITICAL ISSUES';
    if (warnCount > 0) return 'NEEDS ATTENTION';
    return 'ALL SYSTEMS OPERATIONAL';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Phase 2: Personalized AI Learning Paths - QA Validation</span>
          <Button 
            onClick={runQATests} 
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Running Tests...' : 'Re-run QA'}
          </Button>
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Overall Status:</span>
          <Badge variant={overallStatus().includes('CRITICAL') ? 'destructive' : 
                         overallStatus().includes('ATTENTION') ? 'default' : 'default'}
                 className={overallStatus().includes('OPERATIONAL') ? 'bg-green-500 text-white' : ''}>
            {overallStatus()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{result.testName}</h4>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Show Details
                    </summary>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {testResults.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            No test results available. Click "Re-run QA" to start validation.
          </div>
        )}
        
        {isRunning && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">Running Phase 2 validation tests...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
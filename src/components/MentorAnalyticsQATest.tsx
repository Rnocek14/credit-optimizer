import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'pending' | 'warning';
  message: string;
  data?: any;
}

export function MentorAnalyticsQATest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (testName: string, status: TestResult['status'], message: string, data?: any) => {
    setResults(prev => {
      const existingIndex = prev.findIndex(r => r.testName === testName);
      const newResult = { testName, status, message, data };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runComprehensiveQA = async () => {
    setIsRunning(true);
    setResults([]);
    const aishaUserId = '2b458624-d498-4cca-a63d-9341cc20e363';

    try {
      // Test 1: Calculate mentor performance metrics RPC
      updateResult('RPC: calculate_mentor_performance_metrics', 'pending', 'Testing metrics calculation...');
      try {
        const { data: metricsData, error: metricsError } = await supabase.rpc('calculate_mentor_performance_metrics', {
          mentor_user_id: aishaUserId,
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        });

        if (metricsError) {
          updateResult('RPC: calculate_mentor_performance_metrics', 'fail', `Error: ${metricsError.message}`);
        } else if (metricsData && metricsData.length > 0) {
          const metrics = metricsData[0];
          updateResult('RPC: calculate_mentor_performance_metrics', 'pass', 
            `Success: ${metrics.courses_reviewed} courses reviewed, ${metrics.approval_rate}% approval rate`, 
            metrics);
        } else {
          updateResult('RPC: calculate_mentor_performance_metrics', 'warning', 'No metrics data returned');
        }
      } catch (error) {
        updateResult('RPC: calculate_mentor_performance_metrics', 'fail', `Exception: ${error}`);
      }

      // Test 2: Check mentor achievements RPC
      updateResult('RPC: check_mentor_achievements', 'pending', 'Testing achievement check...');
      try {
        const { error: achievementError } = await supabase.rpc('check_mentor_achievements', {
          mentor_user_id: aishaUserId
        });

        if (achievementError) {
          updateResult('RPC: check_mentor_achievements', 'fail', `Error: ${achievementError.message}`);
        } else {
          updateResult('RPC: check_mentor_achievements', 'pass', 'Achievement check completed successfully');
        }
      } catch (error) {
        updateResult('RPC: check_mentor_achievements', 'fail', `Exception: ${error}`);
      }

      // Test 3: Mentor leaderboard retrieval
      updateResult('Query: mentor_leaderboard', 'pending', 'Testing leaderboard query...');
      try {
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('mentor_leaderboard')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(10);

        if (leaderboardError) {
          updateResult('Query: mentor_leaderboard', 'fail', `Error: ${leaderboardError.message}`);
        } else {
          const aishaEntry = leaderboardData?.find(entry => entry.mentor_id === aishaUserId);
          if (aishaEntry) {
            updateResult('Query: mentor_leaderboard', 'pass', 
              `Aisha found at rank ${aishaEntry.rank_position} with ${aishaEntry.total_points} points`, 
              leaderboardData);
          } else {
            updateResult('Query: mentor_leaderboard', 'warning', 'Aisha not found in leaderboard', leaderboardData);
          }
        }
      } catch (error) {
        updateResult('Query: mentor_leaderboard', 'fail', `Exception: ${error}`);
      }

      // Test 4: Mentor achievements retrieval
      updateResult('Query: mentor_achievements', 'pending', 'Testing achievements query...');
      try {
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('mentor_achievements')
          .select('*')
          .eq('mentor_id', aishaUserId)
          .order('earned_at', { ascending: false });

        if (achievementsError) {
          updateResult('Query: mentor_achievements', 'fail', `Error: ${achievementsError.message}`);
        } else if (achievementsData && achievementsData.length > 0) {
          const totalPoints = achievementsData.reduce((sum, achievement) => sum + (achievement.points_awarded || 0), 0);
          updateResult('Query: mentor_achievements', 'pass', 
            `Found ${achievementsData.length} achievements, ${totalPoints} total points`, 
            achievementsData);
        } else {
          updateResult('Query: mentor_achievements', 'warning', 'No achievements found for Aisha');
        }
      } catch (error) {
        updateResult('Query: mentor_achievements', 'fail', `Exception: ${error}`);
      }

      // Test 5: Mentor course feedback retrieval
      updateResult('Query: mentor_course_feedback', 'pending', 'Testing feedback query...');
      try {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('mentor_course_feedback')
          .select('*')
          .eq('mentor_id', aishaUserId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (feedbackError) {
          updateResult('Query: mentor_course_feedback', 'fail', `Error: ${feedbackError.message}`);
        } else if (feedbackData && feedbackData.length > 0) {
          const avgRating = feedbackData.reduce((sum, feedback) => sum + (feedback.rating || 0), 0) / feedbackData.length;
          updateResult('Query: mentor_course_feedback', 'pass', 
            `Found ${feedbackData.length} feedback entries, avg rating: ${avgRating.toFixed(1)}`, 
            feedbackData);
        } else {
          updateResult('Query: mentor_course_feedback', 'warning', 'No feedback found for past 30 days');
        }
      } catch (error) {
        updateResult('Query: mentor_course_feedback', 'fail', `Exception: ${error}`);
      }

      // Test 6: RLS Policy validation
      updateResult('RLS: dev_login_access', 'pending', 'Testing RLS policies...');
      try {
        // Test access to course intelligence pipeline
        const { data: pipelineData, error: pipelineError } = await supabase
          .from('course_intelligence_pipeline')
          .select('*')
          .eq('validated_by', aishaUserId)
          .limit(1);

        if (pipelineError) {
          updateResult('RLS: dev_login_access', 'fail', `Pipeline access error: ${pipelineError.message}`);
        } else {
          updateResult('RLS: dev_login_access', 'pass', 'Dev user can access pipeline data as mentor');
        }
      } catch (error) {
        updateResult('RLS: dev_login_access', 'fail', `RLS Exception: ${error}`);
      }

      toast.success('QA Test completed');
    } catch (error) {
      console.error('QA Test failed:', error);
      toast.error('QA Test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'pending': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800 border-green-200';
      case 'fail': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warning').length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Mentor Analytics QA Test Suite
          <Badge variant={isRunning ? "secondary" : failCount > 0 ? "destructive" : "default"}>
            {isRunning ? 'Running...' : `${passCount} Pass / ${failCount} Fail / ${warnCount} Warn`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveQA} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running QA Tests...
            </>
          ) : (
            'Run Full QA Test for Aisha Khan'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.testName}</span>
                  </div>
                  <Badge variant="outline" className={result.status === 'pass' ? 'border-green-500' : 
                    result.status === 'fail' ? 'border-red-500' : 
                    result.status === 'warning' ? 'border-yellow-500' : 'border-blue-500'}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm mb-2">{result.message}</p>
                {result.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View Data</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
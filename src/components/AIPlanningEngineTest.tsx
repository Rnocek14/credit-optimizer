import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, TestTube, CheckCircle, XCircle, Loader2, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { useAIPlanningEngine } from '@/hooks/useAIPlanningEngine';

export function AIPlanningEngineTest() {
  const [testResults, setTestResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const { generateBackwardPlan, analyzeUnlocks } = useAIPlanningEngine();

  const runFullValidation = async () => {
    setIsRunning(true);
    setTestResults({});
    
    try {
      console.log('🔁 Starting Phase 2 AI Planning Engine Full Validation');
      
      // Test 1: Backward Planning
      console.log('\n=== Test 1: Backward Planning ===');
      const backwardPlanResult = await testBackwardPlanning();
      
      // Test 2: Unlock Analysis
      console.log('\n=== Test 2: Unlock Analysis ===');
      const unlockAnalysisResult = await testUnlockAnalysis();
      
      // Compile results
      const allTestsPassed = backwardPlanResult.passed && unlockAnalysisResult.passed;
      
      setTestResults({
        backwardPlanning: backwardPlanResult,
        unlockAnalysis: unlockAnalysisResult,
        overallStatus: allTestsPassed ? 'PASSED' : 'FAILED',
        summary: allTestsPassed 
          ? '✅ Phase 2 AI Planning Engine is fully operational'
          : '❌ Phase 2 AI Planning Engine has blockers'
      });

    } catch (error) {
      console.error('Test suite failed:', error);
      setTestResults({
        overallStatus: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: '❌ Test suite encountered an unexpected error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testBackwardPlanning = async () => {
    const result = {
      passed: false,
      paths: [],
      errors: [],
      details: {}
    };

    try {
      console.log('Testing backward planning for "UX Designer"...');
      
      const paths = await generateBackwardPlan('UX Designer', {});
      
      if (!paths || paths.length === 0) {
        result.errors.push('No learning paths returned');
        return result;
      }

      console.log(`✅ Generated ${paths.length} learning paths`);
      result.paths = paths;

      // Validate path structure
      let validPaths = 0;
      for (const path of paths) {
        const hasCorrectStructure = path.nodes && path.nodes.length === 3;
        const hasSequence = path.nodes?.[0]?.type === 'course' && 
                           path.nodes?.[1]?.type === 'skill' && 
                           path.nodes?.[2]?.type === 'job';
        const hasMetadata = typeof path.total_time === 'number' && 
                           typeof path.total_cost === 'number' && 
                           typeof path.average_roi === 'number';
        const hasPathType = ['fastest', 'cheapest', 'highest_roi'].includes(path.path_type);

        if (hasCorrectStructure && hasSequence && hasMetadata && hasPathType) {
          validPaths++;
        } else {
          result.errors.push(`Invalid path structure: ${path.id}`);
        }
      }

      result.details = {
        totalPaths: paths.length,
        validPaths,
        pathTypes: paths.map(p => p.path_type),
        avgTime: paths.reduce((sum, p) => sum + p.total_time, 0) / paths.length,
        avgCost: paths.reduce((sum, p) => sum + p.total_cost, 0) / paths.length,
        avgROI: paths.reduce((sum, p) => sum + p.average_roi, 0) / paths.length
      };

      if (validPaths >= 3) {
        result.passed = true;
        console.log(`✅ ${validPaths}/${paths.length} paths have valid structure`);
      } else {
        result.errors.push(`Only ${validPaths} valid paths found (need at least 3)`);
      }

    } catch (error) {
      result.errors.push(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Backward planning test failed:', error);
    }

    return result;
  };

  const testUnlockAnalysis = async () => {
    const result = {
      passed: false,
      analysis: null,
      errors: [],
      details: {}
    };

    try {
      console.log('Testing unlock analysis...');
      
      const skills = ['Figma', 'UX Fundamentals', 'Responsive Design'];
      const courses = ['Design Systems Fundamentals'];
      
      const analysis = await analyzeUnlocks(skills, courses);
      
      console.log('🔍 DEBUG: Full analysis response:', JSON.stringify(analysis, null, 2));
      
      if (!analysis) {
        result.errors.push('No analysis returned');
        console.error('❌ Analysis is null/undefined');
        return result;
      }

      console.log('✅ Analysis completed');
      console.log('📊 Analysis Summary:', {
        unlockedJobs: analysis.unlockedJobs?.length || 0,
        partiallyQualifiedJobs: analysis.partiallyQualifiedJobs?.length || 0,
        recommendedCourses: analysis.recommendedCourses?.length || 0,
        summary: analysis.summary
      });
      
      result.analysis = analysis;

      // Validate analysis structure
      const hasStructure = analysis.summary && 
                          Array.isArray(analysis.unlockedJobs) && 
                          Array.isArray(analysis.partiallyQualifiedJobs) && 
                          Array.isArray(analysis.recommendedCourses);

      if (!hasStructure) {
        result.errors.push('Invalid analysis structure');
        return result;
      }

      // Validate job qualification percentages
      let validJobs = 0;
      [...analysis.unlockedJobs, ...analysis.partiallyQualifiedJobs].forEach(item => {
        if (item.job && typeof item.completionPercentage === 'number' && typeof item.missingSkills === 'number') {
          validJobs++;
        }
      });

      // Validate recommended courses have ROI data
      let validCourses = 0;
      analysis.recommendedCourses.forEach(course => {
        if (course.title && typeof course.market_demand_score === 'number') {
          validCourses++;
        }
      });

      result.details = {
        unlockedJobs: analysis.unlockedJobs.length,
        partiallyQualified: analysis.partiallyQualifiedJobs.length,
        recommendedCourses: analysis.recommendedCourses.length,
        validJobs,
        validCourses,
        summary: analysis.summary
      };

      if (hasStructure && validJobs > 0) {
        result.passed = true;
        console.log(`✅ Analysis structure valid, ${validJobs} valid jobs found`);
      } else {
        result.errors.push('Invalid job or course data structure');
      }

    } catch (error) {
      result.errors.push(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Unlock analysis test failed:', error);
    }

    return result;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5 text-primary" />
          AI Planning Engine Validation Suite
        </CardTitle>
        <CardDescription>
          Run comprehensive tests on the Phase 2 AI Planning Engine after hotfix
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={runFullValidation} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
            <Brain className="w-4 h-4" />
            Run Full Validation
          </Button>
        </div>

        {/* Overall Status */}
        {testResults.overallStatus && (
          <Card className={`border-2 ${
            testResults.overallStatus === 'PASSED' 
              ? 'border-green-500 bg-green-50' 
              : 'border-red-500 bg-red-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                {testResults.overallStatus === 'PASSED' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                {testResults.summary}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        {testResults.backwardPlanning && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">🔁 Backward Planning Test</h3>
            <Card className={testResults.backwardPlanning.passed ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {testResults.backwardPlanning.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    Target: "UX Designer" | Status: {testResults.backwardPlanning.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {testResults.backwardPlanning.details && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{testResults.backwardPlanning.details.totalPaths}</div>
                      <div className="text-sm text-muted-foreground">Total Paths</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{testResults.backwardPlanning.details.avgTime?.toFixed(0)}h</div>
                      <div className="text-sm text-muted-foreground">Avg Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">${testResults.backwardPlanning.details.avgCost?.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">Avg Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{(testResults.backwardPlanning.details.avgROI * 100)?.toFixed(0)}%</div>
                      <div className="text-sm text-muted-foreground">Avg ROI</div>
                    </div>
                  </div>
                )}

                {testResults.backwardPlanning.errors?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-red-600">Errors:</div>
                    {testResults.backwardPlanning.errors.map((error: string, i: number) => (
                      <div key={i} className="text-sm text-red-600">• {error}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {testResults.unlockAnalysis && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">🔓 Unlock Analysis Test</h3>
            <Card className={testResults.unlockAnalysis.passed ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {testResults.unlockAnalysis.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    Skills: ["Figma", "UX Fundamentals", "Responsive Design"] | Status: {testResults.unlockAnalysis.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {testResults.unlockAnalysis.details && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{testResults.unlockAnalysis.details.unlockedJobs}</div>
                      <div className="text-sm text-muted-foreground">Unlocked Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{testResults.unlockAnalysis.details.partiallyQualified}</div>
                      <div className="text-sm text-muted-foreground">Partially Qualified</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{testResults.unlockAnalysis.details.recommendedCourses}</div>
                      <div className="text-sm text-muted-foreground">Recommended</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{testResults.unlockAnalysis.details.validJobs}</div>
                      <div className="text-sm text-muted-foreground">Valid Jobs</div>
                    </div>
                  </div>
                )}

                {testResults.unlockAnalysis.errors?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-red-600">Errors:</div>
                    {testResults.unlockAnalysis.errors.map((error: string, i: number) => (
                      <div key={i} className="text-sm text-red-600">• {error}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Running State */}
        {isRunning && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-muted-foreground">Running comprehensive validation tests...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Unlock, Award, BookOpen, TrendingUp, Loader2 } from 'lucide-react';
import { useAIPlanningEngine, type UnlockAnalysis } from '@/hooks/useAIPlanningEngine';

export function UnlockAnalysisPanel() {
  const [analysis, setAnalysis] = useState<UnlockAnalysis | null>(null);
  const [completedSkills] = useState<string[]>(['skill-1', 'skill-2']); // Mock data
  const [completedCourses] = useState<string[]>(['course-1']); // Mock data
  const { loading, error, analyzeUnlocks } = useAIPlanningEngine();

  const handleAnalyze = async () => {
    const result = await analyzeUnlocks(completedSkills, completedCourses);
    setAnalysis(result);
  };

  // Auto-analyze on component mount
  useEffect(() => {
    handleAnalyze();
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="w-5 h-5 text-primary" />
          Career Unlock Analysis
        </CardTitle>
        <CardDescription>
          Discover what jobs are unlocked and get strategic recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline">{completedSkills.length} skills completed</Badge>
            <Badge variant="outline">{completedCourses.length} courses completed</Badge>
          </div>
          <Button onClick={handleAnalyze} disabled={loading} size="sm">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Refresh Analysis
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-green-600">{analysis.summary.totalUnlocked}</div>
                <div className="text-sm text-muted-foreground">Jobs Unlocked</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{analysis.summary.totalPartial}</div>
                <div className="text-sm text-muted-foreground">Partially Qualified</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-blue-600">{analysis.summary.completedSkillsCount}</div>
                <div className="text-sm text-muted-foreground">Skills Mastered</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-purple-600">{analysis.summary.completedCoursesCount}</div>
                <div className="text-sm text-muted-foreground">Courses Done</div>
              </Card>
            </div>

            {/* Unlocked Jobs */}
            {analysis.unlockedJobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-500" />
                  Unlocked Career Opportunities
                </h3>
                <div className="grid gap-3">
                  {analysis.unlockedJobs.map((item, index) => (
                    <Card key={index} className="p-4 border-green-200 bg-green-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.job.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.missingSkills === 0 ? 'Fully qualified' : `${item.missingSkills} skills remaining`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {Math.round(item.completionPercentage)}% qualified
                          </div>
                          <Progress 
                            value={item.completionPercentage} 
                            className="w-24 h-2 mt-1"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Partially Qualified Jobs */}
            {analysis.partiallyQualifiedJobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                  Nearly Qualified Opportunities
                </h3>
                <div className="grid gap-3">
                  {analysis.partiallyQualifiedJobs.slice(0, 5).map((item, index) => (
                    <Card key={index} className="p-4 border-yellow-200 bg-yellow-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.job.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.missingSkills} more skills needed
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-yellow-600">
                            {Math.round(item.completionPercentage)}% qualified
                          </div>
                          <Progress 
                            value={item.completionPercentage} 
                            className="w-24 h-2 mt-1"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Courses */}
            {analysis.recommendedCourses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Strategic Next Steps
                </h3>
                <div className="grid gap-3">
                  {analysis.recommendedCourses.map((course, index) => (
                    <Card key={course.id} className="p-4 border-blue-200 bg-blue-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{course.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {course.time_cost_hours || 40}h • ${course.monetary_cost || 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            ROI {((course.roi_score || 0.7) * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant="outline">
                            Level {course.difficulty_level || 3}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your career progression...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !analysis && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Unlock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Click "Refresh Analysis" to discover your career opportunities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
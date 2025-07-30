/**
 * Comprehensive CRI Dashboard showing all contributing factors and progress
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  BookOpen, 
  Award, 
  Users, 
  Clock,
  Star,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface CRIDashboardProps {
  userId?: string;
  targetJobId?: string;
}

export const CRIDashboard: React.FC<CRIDashboardProps> = ({ userId, targetJobId }) => {
  const { criScore, isLoading, getReadinessLevel } = useCareerReadiness({ 
    userId, 
    targetJobId,
    enabled: !!userId 
  });

  // Get user's recent transcripts with CRI scores
  const { data: transcripts } = useQuery({
    queryKey: ['user-transcripts-cri', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!userId
  });

  // Get user's CRI history
  const { data: criHistory } = useQuery({
    queryKey: ['cri-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('ai_resume_drafts')
        .select('cri_average, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const readinessLevel = criScore ? getReadinessLevel(criScore.overall) : null;
  const latestCRI = criHistory?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Career Readiness Dashboard
          </h2>
          <p className="text-muted-foreground">
            Track your CRI progress and skill development
          </p>
        </div>
        {criScore && (
          <Badge variant="outline" className={`text-lg px-4 py-2 ${readinessLevel?.color}`}>
            CRI: {criScore.overall}/100
          </Badge>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall CRI</p>
                <p className="text-2xl font-bold">{criScore?.overall || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skills Score</p>
                <p className="text-2xl font-bold">{criScore?.skillsScore || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="text-2xl font-bold">{criScore?.experienceScore || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Readiness</p>
                <p className="text-sm font-medium">{readinessLevel?.level || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="breakdown">CRI Breakdown</TabsTrigger>
          <TabsTrigger value="courses">Learning Impact</TabsTrigger>
          <TabsTrigger value="history">Progress History</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* CRI Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                CRI Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criScore && (
                <>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Skills Mastery</span>
                        <span className="text-sm text-muted-foreground">{criScore.skillsScore}/100</span>
                      </div>
                      <Progress value={criScore.skillsScore} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Career Steps</span>
                        <span className="text-sm text-muted-foreground">{criScore.stepsScore}/100</span>
                      </div>
                      <Progress value={criScore.stepsScore} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Experience Level</span>
                        <span className="text-sm text-muted-foreground">{criScore.experienceScore}/100</span>
                      </div>
                      <Progress value={criScore.experienceScore} className="h-2" />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Completed Skills</p>
                        <p className="font-medium">{criScore.breakdown.completedSkills}/{criScore.breakdown.totalSkills}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed Steps</p>
                        <p className="font-medium">{criScore.breakdown.completedSteps}/{criScore.breakdown.totalSteps}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Impact Tab */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recent Learning Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transcripts && transcripts.length > 0 ? (
                <div className="space-y-3">
                  {transcripts.map((transcript) => (
                    <div key={transcript.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{transcript.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transcript.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          CRI: {transcript.cri_score?.toFixed(1) || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No learning transcripts yet</p>
                  <p className="text-sm">Add courses to see their CRI impact</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                CRI Progress Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {criHistory && criHistory.length > 0 ? (
                <div className="space-y-3">
                  {criHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">CRI Score: {entry.cri_average?.toFixed(1)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {index === 0 ? "Latest" : `${index + 1} ago`}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No CRI history available</p>
                  <p className="text-sm">Submit a resume to start tracking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                CRI Improvement Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criScore && criScore.overall < 70 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Skill Development</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Focus on completing more skills to boost your CRI score.
                    </p>
                    <Button size="sm" variant="outline">
                      Explore Skill Tree
                    </Button>
                  </div>
                )}

                {criScore && criScore.experienceScore < 30 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2">Gain Experience</h4>
                    <p className="text-sm text-orange-700 mb-3">
                      Consider internships, projects, or freelance work to build experience.
                    </p>
                    <Button size="sm" variant="outline">
                      Browse Opportunities
                    </Button>
                  </div>
                )}

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Course Recommendations</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Take courses aligned with your career goals to improve CRI.
                  </p>
                  <Button size="sm" variant="outline">
                    Find Courses
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
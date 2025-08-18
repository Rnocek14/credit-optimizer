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
  Lightbulb,
  RefreshCw,
  MessageCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useCRIEngine } from '@/hooks/useCRIEngine';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface CRIDashboardProps {
  userId?: string;
  targetJobId?: string;
}

export const CRIDashboard: React.FC<CRIDashboardProps> = ({ userId, targetJobId }) => {
  const { 
    criBreakdown, 
    isLoading, 
    isRecalculating, 
    isExplaining,
    recalculateCRI, 
    getMayaExplanation,
    mayaExplanation 
  } = useCRIEngine(userId);

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

  const getReadinessLevel = (score: number) => {
    if (score >= 80) return { level: 'Ready', color: 'text-green-600' };
    if (score >= 60) return { level: 'Nearly Ready', color: 'text-yellow-600' };
    if (score >= 40) return { level: 'In Progress', color: 'text-blue-600' };
    if (score >= 20) return { level: 'Getting Started', color: 'text-orange-600' };
    return { level: 'Just Beginning', color: 'text-gray-600' };
  };

  const readinessLevel = criBreakdown ? getReadinessLevel(criBreakdown.criScore) : null;
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
        <div className="flex items-center gap-2">
          {criBreakdown && (
            <Badge variant="outline" className={`text-lg px-4 py-2 ${readinessLevel?.color}`}>
              CRI: {criBreakdown.criScore}/100
            </Badge>
          )}
          <Button 
            onClick={() => recalculateCRI(targetJobId)} 
            disabled={isRecalculating}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
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
                <p className="text-2xl font-bold">{criBreakdown?.criScore || 0}</p>
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
                <p className="text-2xl font-bold">{criBreakdown?.components.skills || 0}</p>
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
                <p className="text-2xl font-bold">{criBreakdown?.components.experience || 0}</p>
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
              {criBreakdown && (
                <>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Skills</span>
                        <span className="text-sm text-muted-foreground">{criBreakdown.components.skills}/100</span>
                      </div>
                      <Progress value={criBreakdown.components.skills} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Experience</span>
                        <span className="text-sm text-muted-foreground">{criBreakdown.components.experience}/100</span>
                      </div>
                      <Progress value={criBreakdown.components.experience} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Education</span>
                        <span className="text-sm text-muted-foreground">{criBreakdown.components.education}/100</span>
                      </div>
                      <Progress value={criBreakdown.components.education} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Portfolio</span>
                        <span className="text-sm text-muted-foreground">{criBreakdown.components.portfolio}/100</span>
                      </div>
                      <Progress value={criBreakdown.components.portfolio} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Market Readiness</span>
                        <span className="text-sm text-muted-foreground">{criBreakdown.components.marketReadiness}/100</span>
                      </div>
                      <Progress value={criBreakdown.components.marketReadiness} className="h-2" />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Trend Analysis</h4>
                      <div className="flex items-center gap-1 text-sm">
                        {criBreakdown.trend.direction === 'improving' && <ChevronUp className="h-4 w-4 text-green-600" />}
                        {criBreakdown.trend.direction === 'declining' && <ChevronDown className="h-4 w-4 text-red-600" />}
                        <span className={`
                          ${criBreakdown.trend.direction === 'improving' ? 'text-green-600' : ''}
                          ${criBreakdown.trend.direction === 'declining' ? 'text-red-600' : ''}
                          ${criBreakdown.trend.direction === 'stable' ? 'text-gray-600' : ''}
                        `}>
                          {criBreakdown.trend.change > 0 ? '+' : ''}{criBreakdown.trend.change} points
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last calculated: {format(new Date(criBreakdown.lastCalculated), 'MMM dd, yyyy HH:mm')}
                    </p>
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
                {criBreakdown?.recommendations?.map((rec, index) => (
                  <div 
                    key={index}
                    className={`p-4 border rounded-lg ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium mb-2 ${
                          rec.priority === 'high' ? 'text-red-900' :
                          rec.priority === 'medium' ? 'text-yellow-900' :
                          'text-blue-900'
                        }`}>
                          {rec.area}
                        </h4>
                        <p className={`text-sm mb-3 ${
                          rec.priority === 'high' ? 'text-red-700' :
                          rec.priority === 'medium' ? 'text-yellow-700' :
                          'text-blue-700'
                        }`}>
                          {rec.action}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => getMayaExplanation({ 
                            criScore: criBreakdown?.criScore, 
                            area: rec.area,
                            recommendation: rec.action 
                          })}
                          disabled={isExplaining}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {mayaExplanation && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Maya's Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-2">{mayaExplanation.explanation}</p>
                      <p className="text-xs text-muted-foreground">
                        Reasoning: {mayaExplanation.reasoning}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Confidence: {(mayaExplanation.confidence * 100).toFixed(1)}%
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {mayaExplanation.source}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {criBreakdown?.insights && criBreakdown.insights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {criBreakdown.insights.map((insight, index) => (
                          <div key={index} className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
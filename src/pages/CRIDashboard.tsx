/**
 * Main CRI Dashboard Page - Comprehensive view of career readiness
 */

import React from 'react';
import { CRIDashboard as CRIDashboardComponent } from '@/components/CRIDashboard';
import { CRIRecommendationEngine } from '@/components/CRIRecommendationEngine';
import { CRIGoalSetting } from '@/components/CRIGoalSetting';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCRIGoals } from '@/hooks/useCRIGoals';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Target, 
  BookOpen, 
  TrendingUp,
  Users,
  Award,
  Settings
} from 'lucide-react';

export default function CRIDashboardPage() {
  // Get current user (supports both real and demo users)
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      return await getCurrentUser();
    }
  });

  // Get user's active career goals for skill gap analysis
  const { data: careerGoals } = useQuery({
    queryKey: ['career-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('career_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true);
      return data || [];
    },
    enabled: !!user?.id
  });

  const { criScore } = useCareerReadiness({ 
    userId: user?.id,
    enabled: !!user?.id 
  });

  const { targetCRI } = useCRIGoals(user?.id);

  // Extract skill gaps from career goals
  const skillGaps = careerGoals?.flatMap(goal => 
    goal.target_role?.split(',').map((skill: string) => skill.trim()) || []
  ) || [];

  const currentCRI = criScore?.overall || 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Career Readiness Dashboard</h1>
            <p className="text-muted-foreground mb-8">
              Please sign in to access your personal CRI dashboard
            </p>
            <Button>Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Career Readiness Intelligence
              </h1>
              <p className="text-muted-foreground mt-2">
                Track, analyze, and improve your career readiness with AI-powered insights
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Current CRI: {currentCRI}/100
              </Badge>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Learning Path
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Social CRI
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CRIDashboardComponent userId={user.id} />
              </div>
              <div>
                <CRIGoalSetting userId={user.id} currentCRI={currentCRI} />
              </div>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <CRIRecommendationEngine 
              userId={user.id}
              targetCRI={targetCRI}
              skillGaps={skillGaps}
            />
          </TabsContent>

          {/* Learning Path Tab */}
          <TabsContent value="learning" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Learning History & CRI Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>View your transcripts to see CRI impact per course</p>
                      <Button variant="outline" asChild className="mt-3">
                        <a href="/transcripts">View Transcripts</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <CRIGoalSetting userId={user.id} currentCRI={currentCRI} />
              </div>
            </div>
          </TabsContent>

          {/* Social CRI Tab */}
          <TabsContent value="social" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CRI Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    CRI Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>CRI rankings coming soon</p>
                    <p className="text-sm">Compete with peers and track progress</p>
                  </div>
                </CardContent>
              </Card>

              {/* CRI Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    CRI Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Achievement system in development</p>
                    <p className="text-sm">Unlock badges for CRI milestones</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
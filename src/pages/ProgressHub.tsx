import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  History, Trophy, Award, FileText, 
  Star, BookOpen, Target, BarChart3
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useCareerReadiness } from "@/hooks/useCareerReadiness";
import { useActivePlan } from "@/hooks/useActivePlan";
import { useTargetCareer } from "@/hooks/useTargetCareer";
import { SkillsSummary } from "@/components/progress/SkillsSummary";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useQuery } from "@tanstack/react-query";
import { fetchCourseProgress, fetchRecommendedCoursesByIds } from "@/shared/lib/api/progress";
import { fetchLearningStreaks } from "@/shared/lib/api/gamification";
import { fetchUserLevel, fetchUserBadgesWithMeta } from "@/shared/lib/api/gamification";
import { Helmet } from "react-helmet-async";
import { CareerContextBanner } from "@/components/CareerContextBanner";
import { DegreeProgressStrip } from "@/components/progress/DegreeProgressStrip";
import { useMemo } from "react";

export default function ProgressHub() {
  const { activeTrackId } = useActiveTrackStore();
  const { user } = useUser();
  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(activePlan?.target_career_id);
  const { criScore, isCriLoading } = useCareerReadiness({
    userId: user?.id,
    targetJobId: activePlan?.target_career_id ?? undefined,
    enabled: !!user?.id,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'history');

  // Single effect: sync tab ↔ URL without fighting
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'history') {
      setSearchParams({ tab });
    } else {
      setSearchParams({});
    }
  };

  // On mount / external URL change only
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'history';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Real data: user level + XP via DAL
  const { data: userLevel } = useQuery({
    queryKey: ['user-level', user?.id],
    queryFn: () => fetchUserLevel(user!.id),
    enabled: !!user?.id,
  });

  // Real data: course progress
  const { data: courseHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['course-progress', user?.id],
    queryFn: () => fetchCourseProgress(user!.id),
    enabled: !!user?.id,
  });

  // Resolve course titles from recommended_courses
  const courseIds = useMemo(
    () => [...new Set(courseHistory.map(c => c.course_id))],
    [courseHistory]
  );
  const { data: courseTitles = [] } = useQuery({
    queryKey: ['course-titles', courseIds],
    queryFn: () => fetchRecommendedCoursesByIds(courseIds),
    enabled: courseIds.length > 0,
  });
  const titleMap = useMemo(
    () => new Map(courseTitles.map(c => [c.id, c.title])),
    [courseTitles]
  );

  // Real data: streaks
  const { data: streaks = [] } = useQuery({
    queryKey: ['learning-streaks', user?.id],
    queryFn: () => fetchLearningStreaks(user!.id),
    enabled: !!user?.id,
  });

  // Real data: badges earned via DAL
  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: () => fetchUserBadgesWithMeta(user!.id),
    enabled: !!user?.id,
  });

  // Derived stats from real data
  const completedCourses = courseHistory.filter(c => c.status === 'completed').length;
  const currentStreak = streaks.length > 0 ? (streaks[0]?.current_streak ?? 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Progress – Track Your Journey | Pivot</title>
        <meta name="description" content="Track your learning progress, skill tree, and achievements." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Your Progress</h1>
          <p className="text-muted-foreground">
            Track your learning journey and showcase your achievements
          </p>
          <CareerContextBanner />
        </div>

        {/* Degree Progress Strip — real plan data */}
        <DegreeProgressStrip />

        {/* Stats Overview — real data */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-2xl font-bold">{userLevel?.total_xp ?? 0}</p>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-2xl font-bold">{userLevel?.current_level ?? 1}</p>
                </div>
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedCourses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Study Streak</p>
                  <p className="text-2xl font-bold">{currentStreak} days</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {targetCareer ? `Ready for ${targetCareer.title}` : 'Career Readiness'}
                  </p>
                  <p className="text-2xl font-bold">
                    {criScore?.overall != null ? `${Math.round(criScore.overall)}%` : 'Not set'}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="skills" data-testid="tab-skills" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="credentials" data-testid="tab-credentials" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="resume" data-testid="tab-resume" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resume
            </TabsTrigger>
          </TabsList>

          {/* ── Skills Summary — clean, structured ────────── */}
          <TabsContent value="skills" className="mt-6">
            <SkillsSummary courseHistory={courseHistory} userId={user?.id} />
          </TabsContent>

          {/* ── History — real course_progress ───────────────── */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning History</CardTitle>
                <CardDescription>Your completed courses and learning milestones</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : courseHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No learning history yet</h3>
                    <p className="text-muted-foreground mb-4">Start a course to begin tracking your progress.</p>
                    <Button asChild variant="outline">
                      <Link to="/discover?tab=courses">Browse Courses</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courseHistory.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className={`h-2 w-2 rounded-full ${item.status === 'completed' ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{titleMap.get(item.course_id) ?? `Course ${item.course_id.slice(0, 8)}…`}</h4>
                            <Badge variant={item.status === 'completed' ? 'default' : 'outline'}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.last_accessed_at ? `Last active: ${new Date(item.last_accessed_at).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Badges — real user_badges ────────────────────── */}
          <TabsContent value="credentials" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Badges & Achievements</CardTitle>
                <CardDescription>Your verified achievements</CardDescription>
              </CardHeader>
              <CardContent>
                {earnedBadges.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No badges earned yet</h3>
                    <p className="text-muted-foreground mb-4">Complete challenges and courses to earn badges.</p>
                    <Button asChild variant="outline">
                      <Link to="/plan">Start Your Degree Plan</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {earnedBadges.map((ub: any) => (
                      <div key={ub.id} className="border rounded-lg p-4 flex items-start gap-3">
                        <span className="text-2xl">{(ub.badges as any)?.emoji ?? '🏅'}</span>
                        <div>
                          <h4 className="font-medium">{(ub.badges as any)?.name ?? 'Badge'}</h4>
                          <p className="text-sm text-muted-foreground">{(ub.badges as any)?.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Earned {new Date(ub.awarded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Resume ───────────────────────────────────────── */}
          <TabsContent value="resume" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Resume Builder</CardTitle>
                <CardDescription>Create and manage your professional resume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Build Your Resume</h3>
                  <p className="text-muted-foreground mb-4">
                    Use your completed projects and certificates to create a professional resume
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button asChild>
                      <Link to="/resume-builder">Create Resume</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/resume-analytics">View Analytics</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

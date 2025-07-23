import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Trophy, 
  Target, 
  BookOpen, 
  Star, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Calendar,
  Share2,
  Zap,
  Award,
  Brain,
  GraduationCap,
  RefreshCw,
  Loader2
} from "lucide-react";
import { getCurrentUser, getUserProfile } from "@/lib/authHelper";
import { useToast } from "@/hooks/use-toast";
import { usePivotRecommendations } from "@/hooks/usePivotRecommendations";
import { testAllEdgeFunctions } from "@/lib/edgeFunctionTests";

interface UserStats {
  totalXp: number;
  badgeCount: number;
  activeGoals: number;
  transcriptCount: number;
  savedCoursesCount: number;
}

interface ROIInsight {
  careerTitle: string;
  locationName: string;
  locationEmoji: string;
  projectedSalary: number;
  salaryUplift: number;
  roi: number;
  lqi: number;
}

interface TimelineEvent {
  date: string;
  type: 'xp' | 'badge' | 'goal';
  title: string;
  value: number;
}

interface SkillSnapshot {
  topSkills: string[];
  recommendedSkills: string[];
  completedCourseTags: string[];
}

export default function ResumeAnalyticsDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
      }
      setIsLoading(false);
    };
    initUser();
  }, []);

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats", userId],
    queryFn: async (): Promise<UserStats> => {
      if (!userId) throw new Error("No user ID");

      const [xpData, badgesData, goalsData, transcriptsData, coursesData] = await Promise.all([
        supabase.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle(),
        supabase.from("user_badges").select("id").eq("user_id", userId),
        supabase.from("career_goals").select("id").eq("user_id", userId).eq("active", true),
        supabase.from("transcripts").select("id").eq("user_id", userId),
        supabase.from("saved_courses").select("id").eq("user_id", userId)
      ]);

      return {
        totalXp: xpData.data?.total_xp || 0,
        badgeCount: badgesData.data?.length || 0,
        activeGoals: goalsData.data?.length || 0,
        transcriptCount: transcriptsData.data?.length || 0,
        savedCoursesCount: coursesData.data?.length || 0
      };
    },
    enabled: !!userId
  });

  // Fetch ROI insights
  const { data: roiInsight, isLoading: roiLoading } = useQuery({
    queryKey: ["roiInsight", userId],
    queryFn: async (): Promise<ROIInsight | null> => {
      if (!userId) throw new Error("No user ID");

      const profile = await getUserProfile(userId);
      if (!profile?.location) return null;

      // Get user's selected career and location
      const [careerData, locationData] = await Promise.all([
        supabase.from("career_tracks").select("title").eq("user_id", userId).limit(1).maybeSingle(),
        supabase.from("locations").select("label, emoji").ilike("label", `%${profile.location}%`).limit(1).maybeSingle()
      ]);

      if (!careerData.data || !locationData.data) return null;

      // Mock ROI calculation (would be more sophisticated in production)
      const baseSalary = 60000;
      const projectedSalary = baseSalary * 1.3; // 30% uplift assumption
      const salaryUplift = projectedSalary - baseSalary;

      return {
        careerTitle: careerData.data.title,
        locationName: locationData.data.label,
        locationEmoji: locationData.data.emoji,
        projectedSalary,
        salaryUplift,
        roi: 250, // Mock ROI percentage
        lqi: 85    // Mock Location Quality Index
      };
    },
    enabled: !!userId
  });

  // Fetch timeline events
  const { data: timelineEvents, isLoading: timelineLoading } = useQuery({
    queryKey: ["timelineEvents", userId],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!userId) throw new Error("No user ID");

      const [xpEvents, badgeEvents, goalEvents] = await Promise.all([
        supabase.from("xp_events").select("created_at, xp_amount, reason").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("user_badges").select("earned_at, badges(name)").eq("user_id", userId).order("earned_at", { ascending: false }).limit(5),
        supabase.from("career_goals").select("created_at, title").eq("user_id", userId).order("created_at", { ascending: false }).limit(5)
      ]);

      const events: TimelineEvent[] = [];

      // Add XP events
      xpEvents.data?.forEach(event => {
        events.push({
          date: event.created_at,
          type: 'xp',
          title: event.reason || 'XP earned',
          value: event.xp_amount
        });
      });

      // Add badge events
      badgeEvents.data?.forEach(event => {
        events.push({
          date: event.earned_at,
          type: 'badge',
          title: `Earned: ${(event.badges as any)?.name || 'Badge'}`,
          value: 1
        });
      });

      // Add goal events
      goalEvents.data?.forEach(event => {
        events.push({
          date: event.created_at,
          type: 'goal',
          title: `Goal set: ${event.title}`,
          value: 1
        });
      });

      return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    },
    enabled: !!userId
  });

  // Fetch skill snapshot
  const { data: skillSnapshot, isLoading: skillsLoading } = useQuery({
    queryKey: ["skillSnapshot", userId],
    queryFn: async (): Promise<SkillSnapshot> => {
      if (!userId) throw new Error("No user ID");

      const [transcriptsData, coursesData] = await Promise.all([
        supabase.from("transcripts").select("skill_tags").eq("user_id", userId),
        supabase.from("saved_courses").select("recommended_courses(skill_tags)").eq("user_id", userId)
      ]);

      // Extract top skills from transcripts
      const allSkills: string[] = [];
      transcriptsData.data?.forEach(transcript => {
        if (transcript.skill_tags) {
          allSkills.push(...transcript.skill_tags);
        }
      });

      const skillCounts = allSkills.reduce((acc, skill) => {
        acc[skill] = (acc[skill] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSkills = Object.entries(skillCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([skill]) => skill);

      // Extract course tags
      const courseTags: string[] = [];
      coursesData.data?.forEach(course => {
        const courseData = course.recommended_courses as any;
        if (courseData?.skill_tags) {
          courseTags.push(...courseData.skill_tags);
        }
      });

      return {
        topSkills,
        recommendedSkills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS'], // Mock data
        completedCourseTags: [...new Set(courseTags)].slice(0, 8)
      };
    },
    enabled: !!userId
  });

  // Pivot recommendations with mock data
  const { 
    data: pivotRecommendations, 
    isLoading: pivotLoading, 
    refetch: refetchPivots 
  } = usePivotRecommendations({
    current_career: "UX Designer",
    user_skills: ["Figma", "UI Design", "User Research", "HTML", "CSS"],
    preferred_locations: ["Remote", "Europe"],
    enabled: false // Only trigger manually
  });

  const handleExplorePivots = () => {
    console.log("🔍 Exploring career pivots...");
    refetchPivots();
  };

  const handleTestEdgeFunctions = async () => {
    console.log("🧪 Testing edge functions...");
    toast({
      title: "🧪 Testing Edge Functions",
      description: "Running tests... Check console for results.",
    });
    
    try {
      const results = await testAllEdgeFunctions();
      
      if (results.allPassed) {
        toast({
          title: "✅ All Tests Passed!",
          description: "Both edge functions are working correctly.",
        });
      } else {
        toast({
          title: "❌ Some Tests Failed",
          description: "Check console for detailed error information.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Test execution failed:", error);
      toast({
        title: "❌ Test Execution Failed",
        description: "An error occurred while running tests.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    toast({
      title: "🚀 Share Feature Coming Soon!",
      description: "Public analytics sharing will be available soon.",
    });
  };

  // Log pivot results when available
  useEffect(() => {
    if (pivotRecommendations) {
      console.log("✨ Pivot recommendations received:", pivotRecommendations);
    }
  }, [pivotRecommendations]);

  if (isLoading) {
    return <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>;
  }

  if (!userId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
          <p className="text-muted-foreground">Please log in to view your analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              📊 Analytics Dashboard
            </h2>
            <p className="text-muted-foreground">Your learning journey insights</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestEdgeFunctions} variant="outline" className="gap-2">
              🧪 Test Functions
            </Button>
            <Button onClick={handleExplorePivots} variant="outline" className="gap-2" disabled={pivotLoading}>
              {pivotLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              🔁 Explore Career Pivots
            </Button>
            <Button onClick={handleShare} variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Insights
            </Button>
          </div>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger>
                  <div className="space-y-2">
                    <Zap className="h-6 w-6 mx-auto text-yellow-500" />
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-6 w-12 mx-auto" /> : userStats?.totalXp || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Total XP</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Experience points earned from learning activities</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger>
                  <div className="space-y-2">
                    <Award className="h-6 w-6 mx-auto text-purple-500" />
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-6 w-12 mx-auto" /> : userStats?.badgeCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Badges</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Achievement badges earned</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger>
                  <div className="space-y-2">
                    <Target className="h-6 w-6 mx-auto text-blue-500" />
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-6 w-12 mx-auto" /> : userStats?.activeGoals || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Active Goals</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Current learning goals</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger>
                  <div className="space-y-2">
                    <BookOpen className="h-6 w-6 mx-auto text-green-500" />
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-6 w-12 mx-auto" /> : userStats?.transcriptCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Transcripts</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Academic transcripts uploaded</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger>
                  <div className="space-y-2">
                    <GraduationCap className="h-6 w-6 mx-auto text-orange-500" />
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-6 w-12 mx-auto" /> : userStats?.savedCoursesCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Saved Courses</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Courses saved for later</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </div>

        {/* ROI Insights */}
        {roiInsight && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Career ROI Insights
              </CardTitle>
              <CardDescription>Based on your selected career path and location</CardDescription>
            </CardHeader>
            <CardContent>
              {roiLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Career Path</span>
                    </div>
                    <p className="text-lg font-semibold">{roiInsight.careerTitle}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="text-lg font-semibold">{roiInsight.locationEmoji} {roiInsight.locationName}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Projected Salary</span>
                    </div>
                    <p className="text-lg font-semibold">${roiInsight.projectedSalary.toLocaleString()}</p>
                    <p className="text-xs text-green-600">+${roiInsight.salaryUplift.toLocaleString()} uplift</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">ROI Score</span>
                    </div>
                    <p className="text-lg font-semibold">{roiInsight.roi}%</p>
                    <p className="text-xs text-muted-foreground">LQI: {roiInsight.lqi}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline and Learning Snapshot */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📆 Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {timelineEvents?.slice(0, 8).map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        event.type === 'xp' ? 'bg-yellow-100 text-yellow-600' :
                        event.type === 'badge' ? 'bg-purple-100 text-purple-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {event.type === 'xp' ? <Zap className="h-4 w-4" /> :
                         event.type === 'badge' ? <Award className="h-4 w-4" /> :
                         <Target className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                      {event.type === 'xp' && (
                        <Badge variant="secondary">+{event.value} XP</Badge>
                      )}
                    </div>
                  )) || <p className="text-muted-foreground text-center py-4">No recent activity</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🧠 Learning Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skillsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Top Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillSnapshot?.topSkills.slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="default">{skill}</Badge>
                      )) || <p className="text-sm text-muted-foreground">No skills recorded yet</p>}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Recommended Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillSnapshot?.recommendedSkills.slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      )) || <p className="text-sm text-muted-foreground">No recommendations yet</p>}
                    </div>
                  </div>

                  {skillSnapshot?.completedCourseTags && skillSnapshot.completedCourseTags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Course Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {skillSnapshot.completedCourseTags.slice(0, 6).map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
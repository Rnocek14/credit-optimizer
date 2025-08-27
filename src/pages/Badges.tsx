import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import TutorialTip from "@/tutorial/TutorialTip";

interface BadgeType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  trigger_type: string;
  threshold: number | null;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
}

interface UserProgress {
  goals_count: number;
  transcripts_count: number;
  saved_courses_count: number;
  published_resume_count: number;
  cri_score: number | null;
  readiness_score: number | null;
}

interface SuggestedBadge {
  badge_id: string;
  slug: string;
  name: string;
  emoji: string;
  reason: string;
}

export default function Badges() {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [suggestedBadges, setSuggestedBadges] = useState<SuggestedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch all badges
        const { data: badgesData, error: badgesError } = await supabase
          .from('badges')
          .select('*')
          .order('name');

        if (badgesError) throw badgesError;
        setBadges(badgesData || []);

        // Fetch user badges if logged in
        if (user) {
          const [userBadgesResult, goalsResult, transcriptsResult, savedCoursesResult, resumesResult] = await Promise.all([
            supabase
              .from('user_badges')
              .select('badge_id, earned_at')
              .eq('user_id', user.id),
            supabase
              .from('career_goals')
              .select('id')
              .eq('user_id', user.id)
              .eq('active', true),
            supabase
              .from('transcripts')
              .select('id')
              .eq('user_id', user.id),
            supabase
              .from('saved_courses')
              .select('id')
              .eq('user_id', user.id),
            supabase
              .from('ai_resume_drafts')
              .select('id, cri_average, readiness_score')
              .eq('user_id', user.id)
              .eq('published_to_profile', true)
          ]);

          if (userBadgesResult.error) throw userBadgesResult.error;
          setUserBadges(userBadgesResult.data || []);

          // Calculate user progress
          const progress: UserProgress = {
            goals_count: goalsResult.data?.length || 0,
            transcripts_count: transcriptsResult.data?.length || 0,
            saved_courses_count: savedCoursesResult.data?.length || 0,
            published_resume_count: resumesResult.data?.length || 0,
            cri_score: resumesResult.data?.reduce((max, resume) => 
              Math.max(max, resume.cri_average || 0), 0) || null,
            readiness_score: resumesResult.data?.reduce((max, resume) => 
              Math.max(max, resume.readiness_score || 0), 0) || null,
          };
          
          setUserProgress(progress);

          // Fetch suggested badges
          const { data: suggestedData, error: suggestedError } = await supabase
            .rpc('suggest_badges_for_user', { user_uuid: user.id });
          
          if (suggestedError) {
            console.error('Error fetching suggested badges:', suggestedError);
          } else {
            setSuggestedBadges(suggestedData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
        toast({
          title: "Error loading badges",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const isBadgeEarned = (badgeId: string) => {
    return userBadges.some(ub => ub.badge_id === badgeId);
  };

  const formatTriggerType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getThresholdText = (triggerType: string, threshold: number | null) => {
    if (!threshold) return '';
    
    switch (triggerType) {
      case 'goal_count':
        return `${threshold} goal${threshold !== 1 ? 's' : ''}`;
      case 'cri_score':
      case 'readiness_score':
        return `${threshold}+ score`;
      case 'transcript_count':
        return `${threshold} transcript${threshold !== 1 ? 's' : ''}`;
      case 'saved_courses_count':
        return `${threshold} saved course${threshold !== 1 ? 's' : ''}`;
      case 'published_resume_count':
        return `${threshold} published resume${threshold !== 1 ? 's' : ''}`;
      default:
        return `${threshold}`;
    }
  };

  const getProgressInfo = (badge: BadgeType) => {
    if (!user || !userProgress || !badge.threshold || isBadgeEarned(badge.id)) {
      return null;
    }

    let current = 0;
    let target = badge.threshold;
    let progressText = '';
    let showProgressBar = true;

    switch (badge.trigger_type) {
      case 'goal_count':
        current = userProgress.goals_count;
        progressText = `${current} of ${target} goals completed`;
        break;
      case 'transcript_count':
        current = userProgress.transcripts_count;
        progressText = `${current} of ${target} transcripts added`;
        break;
      case 'saved_courses_count':
        current = userProgress.saved_courses_count;
        progressText = `${current} of ${target} courses saved`;
        break;
      case 'published_resume_count':
        current = userProgress.published_resume_count;
        progressText = `${current} of ${target} resumes published`;
        break;
      case 'cri_score':
        current = userProgress.cri_score || 0;
        progressText = `Current: ${current}${current > 0 ? ` / ${target}` : ''}`;
        showProgressBar = false;
        break;
      case 'readiness_score':
        current = userProgress.readiness_score || 0;
        progressText = `Current: ${current}${current > 0 ? ` / ${target}` : ''}`;
        showProgressBar = false;
        break;
      default:
        return null;
    }

    const progressPercentage = showProgressBar ? Math.min((current / target) * 100, 100) : 0;

    return {
      current,
      target,
      progressText,
      progressPercentage,
      showProgressBar
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold">Achievement Badges</h1>
          <TutorialTip id="badgesOverview" label="Achievement badge system" />
        </div>
        <p className="text-muted-foreground">
          Earn badges by completing goals, improving your scores, and engaging with the platform.
          {!user && " Sign in to track your progress!"}
        </p>
      </div>

      {/* Suggested Badges Section */}
      {user && suggestedBadges.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold">🎯 Suggested Badges for You</h2>
            <TutorialTip id="badgeSuggestions" label="Personalized badge recommendations" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedBadges.map((badge) => (
              <Link 
                key={badge.badge_id}
                to={`/badges/${badge.slug}`}
                className="block"
              >
                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:bg-muted/50 border-2 border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{badge.emoji}</span>
                      <div>
                        <CardTitle className="text-lg">{badge.name}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          {badge.reason}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-primary font-medium">
                      Click to view badge details →
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((badge) => {
          const earned = isBadgeEarned(badge.id);
          const progressInfo = getProgressInfo(badge);
          
          return (
            <Card 
              key={badge.id} 
              className={`transition-all duration-200 hover:shadow-lg ${
                earned ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{badge.emoji}</span>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <TutorialTip id="badgeCard" label={badge.name} />
                    </div>
                  </div>
                  {user && (
                    <div className="flex items-center gap-1">
                      {earned ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <TutorialTip id="badgeEarned" label={earned ? "Badge earned" : "Not earned yet"} />
                    </div>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {badge.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Requirement:</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {formatTriggerType(badge.trigger_type)}
                      </Badge>
                      <TutorialTip id="badgeType" label="Badge category" />
                    </div>
                  </div>
                  
                  {badge.threshold && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {getThresholdText(badge.trigger_type, badge.threshold)}
                        </span>
                        <TutorialTip id="badgeTarget" label="Achievement goal" />
                      </div>
                    </div>
                  )}
                  
                  {earned && user && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        ✨ Earned! Keep up the great work.
                      </p>
                    </div>
                  )}

                  {progressInfo && !earned && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                            Progress
                          </p>
                          <TutorialTip id="badgeProgress" label="Progress toward earning this badge" />
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {progressInfo.progressText}
                        </span>
                      </div>
                      {progressInfo.showProgressBar && (
                        <Progress 
                          value={progressInfo.progressPercentage} 
                          className="h-2"
                        />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {badges.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No badges available at the moment.</p>
        </div>
      )}
    </div>
  );
}
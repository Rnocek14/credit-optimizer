import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BadgeType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  trigger_type: string;
  threshold: number | null;
  slug: string;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
}

export default function BadgeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [badge, setBadge] = useState<BadgeType | null>(null);
  const [userBadge, setUserBadge] = useState<UserBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBadgeData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch badge by slug
        const { data: badgeData, error: badgeError } = await supabase
          .from('badges')
          .select('*')
          .eq('slug', slug)
          .single();

        if (badgeError) {
          if (badgeError.code === 'PGRST116') {
            // No rows returned
            setBadge(null);
          } else {
            throw badgeError;
          }
        } else {
          setBadge(badgeData);

          // Fetch user badge if logged in and badge exists
          if (user && badgeData) {
            const { data: userBadgeData, error: userBadgeError } = await supabase
              .from('user_badges')
              .select('badge_id, earned_at')
              .eq('user_id', user.id)
              .eq('badge_id', badgeData.id)
              .maybeSingle();

            if (userBadgeError) throw userBadgeError;
            setUserBadge(userBadgeData);
          }
        }
      } catch (error) {
        console.error('Error fetching badge:', error);
        toast({
          title: "Error loading badge",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBadgeData();
    }
  }, [slug, toast]);

  const formatTriggerType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getThresholdText = (triggerType: string, threshold: number | null) => {
    if (!threshold) return 'No specific threshold';
    
    switch (triggerType) {
      case 'goal_count':
        return `Complete ${threshold} goal${threshold !== 1 ? 's' : ''}`;
      case 'cri_score':
        return `Achieve a CRI score of ${threshold} or higher`;
      case 'readiness_score':
        return `Achieve a readiness score of ${threshold} or higher`;
      case 'transcript_count':
        return `Add ${threshold} transcript${threshold !== 1 ? 's' : ''}`;
      case 'saved_courses_count':
        return `Save ${threshold} course${threshold !== 1 ? 's' : ''}`;
      case 'published_resume_count':
        return `Publish ${threshold} resume${threshold !== 1 ? 's' : ''}`;
      default:
        return `Achieve ${threshold}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Badge Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The badge you're looking for doesn't exist or may have been removed.
          </p>
          <Button asChild>
            <Link to="/badges">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Badges
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const earned = userBadge !== null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="outline" asChild className="mb-6">
          <Link to="/badges">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Badges
          </Link>
        </Button>

        <Card className={`${earned ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-6xl">{badge.emoji}</span>
                <div>
                  <CardTitle className="text-2xl">{badge.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {badge.description}
                  </CardDescription>
                </div>
              </div>
              {user && (
                <div className="flex-shrink-0">
                  {earned ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Category</h3>
                <Badge variant="outline">
                  {formatTriggerType(badge.trigger_type)}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Requirement</h3>
                <p className="text-sm font-medium">
                  {getThresholdText(badge.trigger_type, badge.threshold)}
                </p>
              </div>
            </div>

            {earned && user && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Congratulations! You've earned this badge.
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Earned on {new Date(userBadge!.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!earned && user && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Circle className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      Keep working toward this badge!
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Complete the requirement above to earn this achievement.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!user && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  <Link to="/auth" className="text-primary hover:underline">
                    Sign in
                  </Link>
                  {" "}to track your progress toward this badge.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function Badges() {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
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
          const { data: userBadgesData, error: userBadgesError } = await supabase
            .from('user_badges')
            .select('badge_id, earned_at')
            .eq('user_id', user.id);

          if (userBadgesError) throw userBadgesError;
          setUserBadges(userBadgesData || []);
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
        <h1 className="text-3xl font-bold mb-2">Achievement Badges</h1>
        <p className="text-muted-foreground">
          Earn badges by completing goals, improving your scores, and engaging with the platform.
          {!user && " Sign in to track your progress!"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((badge) => {
          const earned = isBadgeEarned(badge.id);
          
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
                    <div>
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                    </div>
                  </div>
                  {user && (
                    <div className="flex-shrink-0">
                      {earned ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
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
                    <Badge variant="outline" className="text-xs">
                      {formatTriggerType(badge.trigger_type)}
                    </Badge>
                  </div>
                  
                  {badge.threshold && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">
                        {getThresholdText(badge.trigger_type, badge.threshold)}
                      </span>
                    </div>
                  )}
                  
                  {earned && user && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        ✨ Earned! Keep up the great work.
                      </p>
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
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, Star, Target } from 'lucide-react';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useTrackXP } from '@/hooks/useTrackXP';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrackBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  threshold: number;
  trackSpecific: boolean;
  earned: boolean;
  progress: number;
}

interface TrackSpecificBadgesProps {
  className?: string;
}

export function TrackSpecificBadges({ className }: TrackSpecificBadgesProps) {
  const { activeTrackId, activeTrack } = useActiveTrackStore();
  const { xp: userTrackXP } = useTrackXP(activeTrackId);

  // Fetch user's earned badges
  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['user-badges', activeTrackId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          badges(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Generate track-specific badges based on current track and XP
  const trackBadges: TrackBadge[] = React.useMemo(() => {
    const currentXP = userTrackXP?.total_xp || 0;
    const trackName = activeTrack?.track_name || 'Current Track';
    
    const badges: TrackBadge[] = [
      // Track-specific progression badges
      {
        id: `${activeTrackId}-starter`,
        name: `${trackName} Starter`,
        description: `Begin your journey in ${trackName}`,
        emoji: '🌱',
        threshold: 25,
        trackSpecific: true,
        earned: currentXP >= 25,
        progress: Math.min(100, (currentXP / 25) * 100)
      },
      {
        id: `${activeTrackId}-explorer`,
        name: `${trackName} Explorer`,
        description: `Show commitment to ${trackName}`,
        emoji: '🗺️',
        threshold: 100,
        trackSpecific: true,
        earned: currentXP >= 100,
        progress: Math.min(100, (currentXP / 100) * 100)
      },
      {
        id: `${activeTrackId}-practitioner`,
        name: `${trackName} Practitioner`,
        description: `Demonstrate proficiency in ${trackName}`,
        emoji: '⚡',
        threshold: 500,
        trackSpecific: true,
        earned: currentXP >= 500,
        progress: Math.min(100, (currentXP / 500) * 100)
      },
      {
        id: `${activeTrackId}-expert`,
        name: `${trackName} Expert`,
        description: `Master the fundamentals of ${trackName}`,
        emoji: '🎯',
        threshold: 1000,
        trackSpecific: true,
        earned: currentXP >= 1000,
        progress: Math.min(100, (currentXP / 1000) * 100)
      },
      {
        id: `${activeTrackId}-master`,
        name: `${trackName} Master`,
        description: `Achieve mastery in ${trackName}`,
        emoji: '👑',
        threshold: 2000,
        trackSpecific: true,
        earned: currentXP >= 2000,
        progress: Math.min(100, (currentXP / 2000) * 100)
      },
      // Cross-track badges
      {
        id: 'multi-track-explorer',
        name: 'Multi-Track Explorer',
        description: 'Earn XP in 3 different tracks',
        emoji: '🌟',
        threshold: 3,
        trackSpecific: false,
        earned: false, // TODO: Implement cross-track logic
        progress: 33 // Placeholder
      },
      {
        id: 'renaissance-learner',
        name: 'Renaissance Learner',
        description: 'Earn 100+ XP in 5 different tracks',
        emoji: '🎨',
        threshold: 5,
        trackSpecific: false,
        earned: false,
        progress: 20 // Placeholder
      }
    ];

    return badges;
  }, [activeTrackId, activeTrack, userTrackXP]);

  if (!activeTrackId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Track Badges
          </CardTitle>
          <CardDescription>
            Select an active track to view available badges
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const earnedCount = trackBadges.filter(badge => badge.earned).length;
  const trackSpecificBadges = trackBadges.filter(badge => badge.trackSpecific);
  const crossTrackBadges = trackBadges.filter(badge => !badge.trackSpecific);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Badge Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badge Progress
          </CardTitle>
          <CardDescription>
            {earnedCount} of {trackBadges.length} badges earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(earnedCount / trackBadges.length) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Track-Specific Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {activeTrack?.track_name || 'Track'} Badges
          </CardTitle>
          <CardDescription>
            Achievements specific to your current track
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {trackSpecificBadges.map((badge) => (
              <div key={badge.id} className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{badge.emoji}</span>
                    <div>
                      <h4 className={`font-medium ${badge.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {badge.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  {badge.earned && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      Earned
                    </Badge>
                  )}
                </div>
                {!badge.earned && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{userTrackXP?.total_xp || 0}/{badge.threshold} XP</span>
                    </div>
                    <Progress value={badge.progress} className="h-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Track Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Multi-Track Achievements
          </CardTitle>
          <CardDescription>
            Special badges earned across multiple tracks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {crossTrackBadges.map((badge) => (
              <div key={badge.id} className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{badge.emoji}</span>
                    <div>
                      <h4 className={`font-medium ${badge.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {badge.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  {badge.earned && (
                    <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                      Earned
                    </Badge>
                  )}
                </div>
                {!badge.earned && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(badge.progress)}%</span>
                    </div>
                    <Progress value={badge.progress} className="h-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
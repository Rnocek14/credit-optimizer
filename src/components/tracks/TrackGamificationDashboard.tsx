import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Target, Users, Zap } from 'lucide-react';
import { useTrackXP } from '@/hooks/useTrackXP';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrackLeaderboardEntry {
  user_id: string;
  total_xp: number;
  user_name?: string;
  rank: number;
}

interface TrackGamificationDashboardProps {
  className?: string;
}

export function TrackGamificationDashboard({ className }: TrackGamificationDashboardProps) {
  const { activeTrackId } = useActiveTrackStore();
  const { xp: userTrackXP } = useTrackXP(activeTrackId);

  // Fetch track leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['track-leaderboard', activeTrackId],
    queryFn: async (): Promise<TrackLeaderboardEntry[]> => {
      if (!activeTrackId) return [];
      
      const { data, error } = await supabase
        .from('user_track_xp')
        .select('user_id, total_xp')
        .eq('track_id', activeTrackId)
        .order('total_xp', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return (data || []).map((entry, index) => ({
        user_id: entry.user_id,
        total_xp: entry.total_xp,
        user_name: `User ${entry.user_id.slice(0, 8)}`,
        rank: index + 1
      }));
    },
    enabled: !!activeTrackId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch track milestones
  const { data: trackMilestones = [] } = useQuery({
    queryKey: ['track-milestones', activeTrackId],
    queryFn: async () => {
      if (!activeTrackId) return [];
      
      const milestones = [
        { name: "First Steps", threshold: 25, icon: "🚀" },
        { name: "Getting Started", threshold: 100, icon: "⭐" },
        { name: "Making Progress", threshold: 250, icon: "🎯" },
        { name: "Track Explorer", threshold: 500, icon: "🗺️" },
        { name: "Skill Builder", threshold: 1000, icon: "🔨" },
        { name: "Track Master", threshold: 2000, icon: "👑" }
      ];
      
      return milestones.map(milestone => ({
        ...milestone,
        completed: (userTrackXP?.total_xp || 0) >= milestone.threshold,
        progress: Math.min(100, ((userTrackXP?.total_xp || 0) / milestone.threshold) * 100)
      }));
    },
    enabled: !!activeTrackId && !!userTrackXP,
  });

  if (!activeTrackId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Track Gamification
          </CardTitle>
          <CardDescription>
            Select an active track to view gamification features
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const userRank = leaderboard.findIndex(entry => entry.user_id === userTrackXP?.user_id) + 1;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* User Track Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Your Track Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{userTrackXP?.total_xp || 0} XP</p>
              <p className="text-sm text-muted-foreground">
                {userRank > 0 ? `Rank #${userRank}` : 'Not ranked yet'}
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Track Focus
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Track Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Track Leaderboard
          </CardTitle>
          <CardDescription>Top performers in this track</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((entry) => (
              <div key={entry.user_id} className="flex items-center gap-3">
                <Badge 
                  variant={entry.rank <= 3 ? "default" : "secondary"}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                >
                  #{entry.rank}
                </Badge>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{entry.user_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{entry.user_name}</p>
                  <p className="text-sm text-muted-foreground">{entry.total_xp} XP</p>
                </div>
                {entry.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Track Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Track Milestones
          </CardTitle>
          <CardDescription>Achievements in this track</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trackMilestones.map((milestone) => (
              <div key={milestone.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{milestone.icon}</span>
                    <span className={milestone.completed ? 'font-medium' : 'text-muted-foreground'}>
                      {milestone.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {userTrackXP?.total_xp || 0}/{milestone.threshold} XP
                    </span>
                    {milestone.completed && (
                      <Badge variant="default" className="text-xs">Achieved</Badge>
                    )}
                  </div>
                </div>
                <Progress value={milestone.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Track Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Track Explorer
          </CardTitle>
          <CardDescription>Your progress across all tracks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Track your progress across multiple career paths to unlock special cross-track achievements
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  fetchLearningStreaks,
  fetchCelebrationMoments,
  fetchGamificationMetrics,
  updateCelebrationMoment,
  rpcUpdateLearningStreak,
  rpcCreateCelebrationMoment,
} from "@/shared/lib/api/gamification";

export interface LearningStreak {
  id: string;
  user_id: string;
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  streak_start_date: string;
  bonus_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface CelebrationMoment {
  id: string;
  user_id: string;
  celebration_type: string;
  trigger_data: any;
  celebration_data: any;
  displayed_at?: string;
  dismissed_at?: string;
  created_at: string;
}

export interface GamificationMetrics {
  daily_xp: number;
  streak_bonus: number;
  total_celebrations: number;
  maya_collaboration_score: number;
  engagement_trend: number;
}

export function useGamification(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user ID (auth or dev user)
  const currentUserId = userId || '2b458624-d498-4cca-a63d-9341cc20e363'; // Default to Aisha Khan for demo

  // Fetch learning streaks
  const { data: streaks, isLoading: streaksLoading } = useQuery({
    queryKey: ['learning-streaks', currentUserId],
    queryFn: () => fetchLearningStreaks(currentUserId),
  });

  // Fetch celebration moments
  const { data: celebrations, isLoading: celebrationsLoading } = useQuery({
    queryKey: ['celebration-moments', currentUserId],
    queryFn: () => fetchCelebrationMoments(currentUserId, 20),
  });

  // Fetch gamification metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['gamification-metrics', currentUserId],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const data = await fetchGamificationMetrics(
        currentUserId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Calculate aggregate metrics
      const dailyXP = data.filter(m => m.metric_type === 'daily_xp').reduce((sum, m) => sum + Number(m.metric_value), 0);
      const streakBonus = data.filter(m => m.metric_type === 'streak_bonus').reduce((sum, m) => sum + Number(m.metric_value), 0);
      const mayaCollaboration = data.filter(m => m.metric_type === 'maya_collaboration').reduce((avg, m) => avg + Number(m.metric_value), 0) / Math.max(1, data.filter(m => m.metric_type === 'maya_collaboration').length);

      return {
        daily_xp: dailyXP,
        streak_bonus: streakBonus,
        total_celebrations: celebrations?.length || 0,
        maya_collaboration_score: mayaCollaboration || 0,
        engagement_trend: 0.75 // Mock for now
      } as GamificationMetrics;
    },
    enabled: !!celebrations
  });

  // Update streak mutation
  const updateStreak = useMutation({
    mutationFn: () => rpcUpdateLearningStreak(currentUserId),
    onSuccess: (data: any) => {
      if (data?.milestone_reached) {
        toast({
          title: "🔥 Streak Milestone!",
          description: `You've maintained a ${data.current_streak}-day learning streak!`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['learning-streaks'] });
      queryClient.invalidateQueries({ queryKey: ['celebration-moments'] });
    },
    onError: (error) => {
      console.error('Error updating streak:', error);
      toast({
        title: "Error",
        description: "Failed to update learning streak",
        variant: "destructive",
      });
    },
  });

  // Mark celebration as displayed
  const markCelebrationDisplayed = useMutation({
    mutationFn: (celebrationId: string) =>
      updateCelebrationMoment(celebrationId, currentUserId, {
        displayed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['celebration-moments'] });
    },
  });

  // Dismiss celebration
  const dismissCelebration = useMutation({
    mutationFn: (celebrationId: string) =>
      updateCelebrationMoment(celebrationId, currentUserId, {
        dismissed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['celebration-moments'] });
    },
  });

  // Create celebration moment
  const createCelebration = useMutation({
    mutationFn: async ({ type, triggerData, celebrationData }: {
      type: string;
      triggerData: any;
      celebrationData: any;
    }) => rpcCreateCelebrationMoment(currentUserId, type, triggerData, celebrationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['celebration-moments'] });
    },
  });

  // Helper functions
  const getCurrentStreak = () => {
    const dailyStreak = streaks?.find(s => s.streak_type === 'daily');
    return dailyStreak?.current_streak || 0;
  };

  const getLongestStreak = () => {
    const dailyStreak = streaks?.find(s => s.streak_type === 'daily');
    return dailyStreak?.longest_streak || 0;
  };

  const getUnreadCelebrations = () => {
    return celebrations?.filter(c => !c.displayed_at) || [];
  };

  const getStreakMultiplier = () => {
    const currentStreak = getCurrentStreak();
    return Math.min(1 + (currentStreak * 0.02), 1.5); // Max 50% bonus
  };

  return {
    // Data
    streaks,
    celebrations,
    metrics,
    
    // Loading states
    isLoading: streaksLoading || celebrationsLoading || metricsLoading,
    
    // Mutations
    updateStreak,
    markCelebrationDisplayed,
    dismissCelebration,
    createCelebration,
    
    // Helper functions
    getCurrentStreak,
    getLongestStreak,
    getUnreadCelebrations,
    getStreakMultiplier,
  };
}

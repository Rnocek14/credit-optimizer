import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MentorMetrics {
  courses_reviewed: number;
  courses_approved: number;
  courses_rejected: number;
  approval_rate: number;
  avg_review_time_hours: number;
  impact_score: number;
  quality_score: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  badge_emoji: string;
  points_awarded: number;
  earned_at: string;
  metadata?: any;
}

interface LeaderboardEntry {
  mentor_id: string;
  rank_position: number;
  total_points: number;
  validation_score: number;
  impact_score: number;
  speed_score: number;
  quality_score: number;
  period_type: string;
}

interface StudentFeedback {
  id: string;
  course_id: string;
  student_id: string;
  mentor_id: string;
  rating: number;
  feedback_text?: string;
  course_quality_rating: number;
  learning_outcome_rating: number;
  would_recommend: boolean;
  completed_course: boolean;
  created_at: string;
}

export const useMentorAnalytics = () => {
  const [metrics, setMetrics] = useState<MentorMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feedback, setFeedback] = useState<StudentFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMentorMetrics = async (userId: string, startDate: Date, endDate: Date) => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_mentor_performance_metrics', {
          mentor_user_id: userId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching mentor metrics:', error);
      throw error;
    }
  };

  const fetchAchievements = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('mentor_achievements')
        .select('*')
        .eq('mentor_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  };

  const fetchLeaderboard = async (periodType: string = 'monthly', limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('mentor_leaderboard')
        .select('*')
        .eq('period_type', periodType)
        .order('rank_position')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  };

  const fetchStudentFeedback = async (userId: string, startDate: Date, limit: number = 20) => {
    try {
      const { data, error } = await supabase
        .from('mentor_course_feedback')
        .select('*')
        .eq('mentor_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  };

  const checkMentorAchievements = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('check_mentor_achievements', {
        mentor_user_id: userId
      });

      if (error) throw error;

      toast({
        title: "Achievements Updated",
        description: "Checked for new achievements based on your recent activity"
      });

      return true;
    } catch (error) {
      console.error('Error checking achievements:', error);
      toast({
        title: "Error",
        description: "Failed to check for new achievements",
        variant: "destructive"
      });
      return false;
    }
  };

  const fetchAllAnalyticsData = async (timeframe: string = 'monthly') => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeframe === 'weekly') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeframe === 'monthly') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setFullYear(2024, 0, 1); // All time
      }

      // Fetch all data concurrently
      const [metricsData, achievementsData, leaderboardData, feedbackData] = await Promise.all([
        fetchMentorMetrics(user.id, startDate, endDate),
        fetchAchievements(user.id),
        fetchLeaderboard(timeframe === 'all_time' ? 'all_time' : timeframe),
        fetchStudentFeedback(user.id, startDate)
      ]);

      setMetrics(metricsData);
      setAchievements(achievementsData);
      setLeaderboard(leaderboardData);
      setFeedback(feedbackData);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const submitStudentFeedback = async (feedbackData: Omit<StudentFeedback, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('mentor_course_feedback')
        .insert([feedbackData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!"
      });

      return data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    // State
    metrics,
    achievements,
    leaderboard,
    feedback,
    loading,

    // Methods
    fetchAllAnalyticsData,
    fetchMentorMetrics,
    fetchAchievements,
    fetchLeaderboard,
    fetchStudentFeedback,
    checkMentorAchievements,
    submitStudentFeedback,

    // Computed values
    totalPoints: achievements.reduce((sum, achievement) => sum + achievement.points_awarded, 0),
    latestAchievement: achievements[0] || null,
    approvalRate: metrics?.approval_rate || 0,
    qualityScore: metrics?.quality_score || 0,
  };
};
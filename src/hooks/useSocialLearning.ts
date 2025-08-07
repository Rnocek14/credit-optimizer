import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  career_path: string;
  skill_focus?: string[];
  max_members: number;
  privacy_level: 'public' | 'invite_only' | 'private';
  group_type: 'general' | 'study_challenge' | 'project_based' | 'mentor_led';
  created_at: string;
  member_count?: number;
  user_is_member?: boolean;
}

export interface LearningChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'individual' | 'team' | 'group' | 'global';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  skill_focus?: string[];
  career_paths?: string[];
  start_date: string;
  end_date: string;
  xp_reward: number;
  max_participants?: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  participant_count?: number;
  user_is_participant?: boolean;
}

export interface PeerFeedback {
  id: string;
  from_user_id: string;
  to_user_id: string;
  feedback_type: 'skill_validation' | 'project_review' | 'learning_progress' | 'collaboration';
  rating: number;
  feedback_text?: string;
  skills_endorsed?: string[];
  created_at: string;
}

export interface SocialLearningMetrics {
  total_groups_joined: number;
  challenges_completed: number;
  peer_feedback_given: number;
  peer_feedback_received: number;
  average_peer_rating: number;
  collaboration_score: number;
  social_xp_earned: number;
}

export function useSocialLearning(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch study groups
  const { data: studyGroups, isLoading: loadingGroups } = useQuery({
    queryKey: ['study-groups', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members!inner(count)
        `)
        .eq('privacy_level', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupsWithMemberCount = await Promise.all(
        data.map(async (group) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('study_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Check if user is member
          let userIsMember = false;
          if (userId) {
            const { data: membership } = await supabase
              .from('study_group_members')
              .select('id')
              .eq('group_id', group.id)
              .eq('user_id', userId)
              .single();
            userIsMember = !!membership;
          }

          return {
            ...group,
            member_count: memberCount || 0,
            user_is_member: userIsMember
          };
        })
      );

      return groupsWithMemberCount;
    },
    enabled: !!userId
  });

  // Fetch learning challenges
  const { data: challenges, isLoading: loadingChallenges } = useQuery({
    queryKey: ['learning-challenges', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_challenges')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true });

      if (error) throw error;

      const challengesWithParticipants = await Promise.all(
        data.map(async (challenge) => {
          // Get participant count
          const { count: participantCount } = await supabase
            .from('challenge_participants')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', challenge.id);

          // Check if user is participant
          let userIsParticipant = false;
          if (userId) {
            const { data: participation } = await supabase
              .from('challenge_participants')
              .select('id')
              .eq('challenge_id', challenge.id)
              .eq('user_id', userId)
              .single();
            userIsParticipant = !!participation;
          }

          return {
            ...challenge,
            participant_count: participantCount || 0,
            user_is_participant: userIsParticipant
          };
        })
      );

      return challengesWithParticipants;
    }
  });

  // Fetch social learning metrics
  const { data: socialMetrics } = useQuery({
    queryKey: ['social-learning-metrics', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get groups joined
      const { count: groupsJoined } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get challenges completed
      const { count: challengesCompleted } = await supabase
        .from('challenge_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completion_status', 'completed');

      // Get peer feedback given
      const { count: feedbackGiven } = await supabase
        .from('peer_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('from_user_id', userId);

      // Get peer feedback received
      const { data: feedbackReceived } = await supabase
        .from('peer_feedback')
        .select('rating')
        .eq('to_user_id', userId);

      const averageRating = feedbackReceived?.length > 0 
        ? feedbackReceived.reduce((sum, fb) => sum + fb.rating, 0) / feedbackReceived.length
        : 0;

      const collaborationScore = Math.min(100, 
        ((groupsJoined || 0) * 10) + 
        ((challengesCompleted || 0) * 15) + 
        ((feedbackGiven || 0) * 5) + 
        (averageRating * 10)
      );

      return {
        total_groups_joined: groupsJoined || 0,
        challenges_completed: challengesCompleted || 0,
        peer_feedback_given: feedbackGiven || 0,
        peer_feedback_received: feedbackReceived?.length || 0,
        average_peer_rating: averageRating,
        collaboration_score: collaborationScore,
        social_xp_earned: ((challengesCompleted || 0) * 50) + ((groupsJoined || 0) * 25)
      };
    },
    enabled: !!userId
  });

  // Join study group mutation
  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['social-learning-metrics'] });
      toast({
        title: "Joined Study Group",
        description: "You've successfully joined the study group!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Join Group",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Join challenge mutation
  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          completion_status: 'registered'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['social-learning-metrics'] });
      toast({
        title: "Joined Challenge",
        description: "You've successfully registered for the challenge!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Join Challenge",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Submit peer feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (feedback: {
      to_user_id: string;
      feedback_type: string;
      rating: number;
      feedback_text?: string;
      skills_endorsed?: string[];
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('peer_feedback')
        .insert({
          from_user_id: userId,
          context_type: 'general',
          ...feedback
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-learning-metrics'] });
      toast({
        title: "Feedback Submitted",
        description: "Your peer feedback has been submitted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Submit Feedback",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    studyGroups,
    challenges,
    socialMetrics,
    loadingGroups,
    loadingChallenges,
    joinGroup,
    joinChallenge,
    submitFeedback
  };
}
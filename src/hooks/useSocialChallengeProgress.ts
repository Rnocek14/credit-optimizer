import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCertificateEngine } from './useCertificateEngine';

export interface ChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  completion_status: string;
  registered_at: string;
  completed_at?: string;
  final_score?: number;
  progress_data?: any;
  learning_challenges?: {
    id: string;
    title: string;
    xp_reward: number;
    difficulty_level: string;
  };
}

export function useSocialChallengeProgress(userId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generateCertificate } = useCertificateEngine();

  // Fetch user's challenge progress
  const { data: challengeProgress = [], isLoading } = useQuery({
    queryKey: ['challenge-progress', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          learning_challenges!inner (
            id,
            title,
            xp_reward,
            difficulty_level
          )
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Update challenge progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ challengeId, progress }: { challengeId: string; progress: number }) => {
      const { data, error } = await supabase
        .from('challenge_participants')
        .update({ 
          progress_data: { progress },
          completion_status: progress >= 100 ? 'completed' : 'in_progress',
          completed_at: progress >= 100 ? new Date().toISOString() : null
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      // If completed, generate certificate and award XP
      if (progress >= 100) {
        const challenge = challengeProgress.find(cp => cp.challenge_id === challengeId)?.learning_challenges;
        if (challenge) {
          // Generate skill verification certificate
          await generateCertificate({
            certificateType: 'skill_verification',
            certificateData: {
              title: `${challenge.title} Challenge Completion`,
              description: `Successfully completed the ${challenge.title} learning challenge`,
              skills: [challenge.title],
              metadata: { difficulty: challenge.difficulty_level, xpAwarded: challenge.xp_reward }
            }
          });
          
          // Award XP would be handled by database trigger or separate function
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge-progress', userId] });
      queryClient.invalidateQueries({ queryKey: ['certificates', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-xp', userId] });
      
      const progressValue = data.progress_data?.progress || 0;
      if (progressValue >= 100) {
        toast({
          title: "Challenge Completed! 🎉",
          description: "You've earned XP and a skill verification certificate!",
        });
      } else {
        toast({
          title: "Progress Saved",
          description: `Challenge progress updated to ${progressValue}%`,
        });
      }
    },
    onError: (error) => {
      console.error('Error updating challenge progress:', error);
      toast({
        title: "Error",
        description: "Failed to update challenge progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    challengeProgress,
    isLoading,
    updateProgress: updateProgressMutation.mutate,
    isUpdating: updateProgressMutation.isPending,
  };
}
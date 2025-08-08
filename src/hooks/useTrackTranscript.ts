
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TrackCourseUsage {
  id: string;
  user_id: string;
  track_id: string;
  course_id: string;
  progress_id?: string | null;
  note?: string | null;
  created_at: string;
}

export function useTrackTranscript(trackId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const usageQuery = useQuery({
    queryKey: ['course-progress-track-usage', trackId],
    queryFn: async (): Promise<TrackCourseUsage[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('course_progress_track_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TrackCourseUsage[];
    },
    enabled: !!trackId,
  });

  const tagCourse = useMutation({
    mutationFn: async ({ courseId, note, progressId }: { courseId: string; note?: string; progressId?: string; }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !trackId) throw new Error('Missing user or track');
      const { data, error } = await supabase
        .from('course_progress_track_usage')
        .insert({
          user_id: user.id,
          track_id: trackId,
          course_id: courseId,
          note: note ?? null,
          progress_id: progressId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TrackCourseUsage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress-track-usage', trackId] });
      toast({ title: 'Tagged course', description: 'Course tagged to this track.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to tag course', description: err.message, variant: 'destructive' });
    }
  });

  const untagCourse = useMutation({
    mutationFn: async (usageId: string) => {
      const { error } = await supabase
        .from('course_progress_track_usage')
        .delete()
        .eq('id', usageId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress-track-usage', trackId] });
      toast({ title: 'Removed tag', description: 'Course untagged from this track.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to untag course', description: err.message, variant: 'destructive' });
    }
  });

  return {
    usage: usageQuery.data || [],
    isLoading: usageQuery.isLoading,
    error: usageQuery.error,
    tagCourse: tagCourse.mutateAsync,
    untagCourse: untagCourse.mutateAsync,
    isTagging: tagCourse.isPending,
    isUntagging: untagCourse.isPending,
    refetch: usageQuery.refetch,
  };
}

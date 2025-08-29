
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';

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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress-track-usage', trackId] });
      toast({ title: 'Tagged course', description: 'Course tagged to this track.' });
      
      // Track telemetry event
      trackTelemetryEvent({
        task: 'track_course_tag_added',
        complexity: { track_id: trackId, course_id: variables.courseId }
      });
    },
    onError: (err: any) => {
      // Handle duplicate constraint error gracefully
      const isDuplicateError = err.message?.includes('duplicate key value') || 
                               err.code === '23505';
      
      if (isDuplicateError) {
        toast({ 
          title: 'Course already in track', 
          description: 'This course is already added to your track transcript.',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Failed to tag course', 
          description: err.message || 'An error occurred while adding the course.',
          variant: 'destructive' 
        });
      }
    }
  });

  const untagCourse = useMutation({
    mutationFn: async (usageId: string) => {
      // Get the course_id before deletion for telemetry
      const { data: usageData } = await supabase
        .from('course_progress_track_usage')
        .select('course_id')
        .eq('id', usageId)
        .single();
      
      const { error } = await supabase
        .from('course_progress_track_usage')
        .delete()
        .eq('id', usageId);
      if (error) throw error;
      return usageData?.course_id;
    },
    onSuccess: (courseId) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress-track-usage', trackId] });
      toast({ title: 'Removed tag', description: 'Course untagged from this track.' });
      
      // Track telemetry event
      if (courseId && trackId) {
        trackTelemetryEvent({
          task: 'track_course_tag_removed',
          complexity: { track_id: trackId, course_id: courseId }
        });
      }
    },
    onError: (err: any) => {
      toast({ 
        title: 'Failed to untag course', 
        description: err.message || 'An error occurred while removing the course.',
        variant: 'destructive' 
      });
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
    isAlreadyTagged: (courseId: string) => 
      usageQuery.data?.some(u => u.course_id === courseId) || false,
  };
}

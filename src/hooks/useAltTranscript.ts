import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { useToast } from '@/hooks/use-toast';

export interface AltCourseUsage {
  id: string;
  alt_course_id: string;
  note: string | null;
  created_at: string;
}

export function useAltTranscript(trackId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const usageQuery = useQuery({
    queryKey: ['alt-usage', trackId],
    queryFn: async (): Promise<AltCourseUsage[]> => {
      if (!trackId) return [];
      
      const user = await getCurrentUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_alt_course_usage')
        .select('id, alt_course_id, note, created_at')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!trackId
  });

  const isAlreadyTagged = (altCourseId: string) =>
    usageQuery.data?.some(u => u.alt_course_id === altCourseId) || false;

  const tag = useMutation({
    mutationFn: async ({ altCourseId, note }: { altCourseId: string; note?: string }) => {
      const user = await getCurrentUser();
      if (!user || !trackId) throw new Error('Missing user or track');
      
      const { data, error } = await supabase
        .from('user_alt_course_usage')
        .insert({ 
          user_id: user.id, 
          track_id: trackId, 
          alt_course_id: altCourseId, 
          note: note ?? null 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alt-usage', trackId] });
      toast({ 
        title: 'Added alternative course', 
        description: 'Tagged to your track.' 
      });
      trackTelemetryEvent({ 
        task: 'alt_course_tag_added', 
        complexity: { track_id: trackId, alt_course_id: variables.altCourseId } 
      });
    },
    onError: (err: any) => {
      const duplicate = err?.code === '23505' || /duplicate key/.test(err?.message ?? '');
      toast({
        title: duplicate ? 'Already added' : 'Failed to add',
        description: duplicate 
          ? 'This alternative course is already tagged in your track.' 
          : (err?.message ?? 'Unknown error'),
        variant: 'destructive'
      });
    }
  });

  const untag = useMutation({
    mutationFn: async (usageId: string) => {
      const { data: row } = await supabase
        .from('user_alt_course_usage')
        .select('alt_course_id')
        .eq('id', usageId)
        .single();
      
      const { error } = await supabase
        .from('user_alt_course_usage')
        .delete()
        .eq('id', usageId);
      
      if (error) throw error;
      return row?.alt_course_id as string | undefined;
    },
    onSuccess: (altCourseId) => {
      queryClient.invalidateQueries({ queryKey: ['alt-usage', trackId] });
      toast({ 
        title: 'Removed', 
        description: 'Alternative course untagged.' 
      });
      if (altCourseId) {
        trackTelemetryEvent({ 
          task: 'alt_course_tag_removed', 
          complexity: { track_id: trackId, alt_course_id: altCourseId } 
        });
      }
    },
    onError: (err: any) => {
      toast({ 
        title: 'Failed to remove', 
        description: err?.message ?? 'Unknown error', 
        variant: 'destructive' 
      });
    }
  });

  return {
    usage: usageQuery.data ?? [],
    isLoading: usageQuery.isLoading,
    isAlreadyTagged,
    tagAltCourse: tag.mutateAsync,
    untagAltCourse: untag.mutateAsync,
    isTagging: tag.isPending,
    isUntagging: untag.isPending
  };
}
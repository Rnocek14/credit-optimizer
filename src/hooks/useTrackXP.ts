
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface UserTrackXP {
  id: string;
  user_id: string;
  track_id: string;
  total_xp: number;
  last_updated: string;
}

export interface TrackXPEvent {
  id: string;
  user_id: string;
  track_id: string;
  xp: number;
  reason?: string | null;
  source?: string | null;
  metadata: any;
  created_at: string;
}

export function useTrackXP(trackId?: string | null) {
  const xpQuery = useQuery({
    queryKey: QUERY_KEYS.USER_TRACK_XP(undefined, trackId),
    queryFn: async (): Promise<UserTrackXP | null> => {
      if (!trackId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_track_xp')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();

      if (error) throw error;
      return (data as UserTrackXP) || null;
    },
    enabled: !!trackId,
    staleTime: 60 * 1000,
  });

  const eventsQuery = useQuery({
    queryKey: QUERY_KEYS.USER_TRACK_XP_EVENTS(undefined, trackId),
    queryFn: async (): Promise<TrackXPEvent[]> => {
      if (!trackId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_track_xp_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TrackXPEvent[];
    },
    enabled: !!trackId,
    staleTime: 60 * 1000,
  });

  return {
    xp: xpQuery.data,
    xpEvents: eventsQuery.data || [],
    isLoading: xpQuery.isLoading || eventsQuery.isLoading,
    error: xpQuery.error || eventsQuery.error,
    refetch: () => {
      xpQuery.refetch();
      eventsQuery.refetch();
    }
  };
}

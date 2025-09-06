
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CareerTrack, CreateTrackInput, UpdateTrackInput } from '@/types/tracks';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/authHelper';
import { slugify, generateUniqueSlug } from '@/lib/slugify';

export function useTracks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tracksQuery = useQuery({
    queryKey: ['career-tracks'],
    queryFn: async (): Promise<CareerTrack[]> => {
      console.log('[useTracks] Fetching tracks...');
      const user = await getCurrentUser();
      console.log('[useTracks] User:', user?.id);
      if (!user) {
        console.log('[useTracks] No user found, returning empty array');
        return [];
      }

      // First get the profile ID for this auth user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        console.log('[useTracks] No profile found for user, returning empty array');
        return [];
      }

      console.log('[useTracks] Profile ID:', profile.id);

      // Now fetch tracks using the profile ID
      const { data, error } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', profile.id)
        .order('archived', { ascending: true })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useTracks] Error fetching tracks:', error);
        throw error;
      }
      console.log('[useTracks] Tracks fetched:', data?.length || 0, 'tracks');
      return (data || []) as CareerTrack[];
    },
  });

  const createTrack = useMutation({
    mutationFn: async (input: CreateTrackInput) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Generate slug from track name
      const baseSlug = slugify(input.track_name);
      
      // Get existing slugs to ensure uniqueness
      const { data: existingTracks } = await supabase
        .from('career_tracks')
        .select('slug')
        .eq('user_id', user.id)
        .not('slug', 'is', null);
      
      const existingSlugs = existingTracks?.map(t => t.slug).filter(Boolean) || [];
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

      const { data, error } = await supabase
        .from('career_tracks')
        .insert({
          user_id: user.id,
          track_name: input.track_name,
          title: input.track_name,
          slug: uniqueSlug,
          goal: input.goal || null,
          icon: input.icon || null,
          color: input.color || null,
          archived: false,
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CareerTrack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      toast({ title: 'Track created', description: `Created "${data.track_name || data.title}"` });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create track', description: err.message, variant: 'destructive' });
    },
  });

  const updateTrack = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateTrackInput }) => {
      const { data, error } = await supabase
        .from('career_tracks')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CareerTrack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      toast({ title: 'Track updated', description: `Updated "${data.track_name || data.title}"` });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update track', description: err.message, variant: 'destructive' });
    },
  });

  const archiveTrack = useMutation({
    mutationFn: async ({ id, archived = true }: { id: string; archived?: boolean }) => {
      const { data, error } = await supabase
        .from('career_tracks')
        .update({ archived })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CareerTrack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      const verb = data.archived ? 'archived' : 'restored';
      toast({ title: `Track ${verb}`, description: `"${data.track_name || data.title}" ${verb}` });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update track', description: err.message, variant: 'destructive' });
    },
  });

  const cloneTrack = useMutation({
    mutationFn: async ({ sourceTrackId, newName, icon, color }: { sourceTrackId: string; newName: string; icon?: string | null; color?: string | null; }) => {
      const { data, error } = await supabase.rpc('clone_career_track', {
        source_track_id: sourceTrackId,
        new_track_name: newName,
        new_icon: icon ?? null,
        new_color: color ?? null,
      });
      if (error) throw error;
      return data as string; // new track id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-tracks'] });
      toast({ title: 'Track cloned', description: 'Your track has been cloned.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to clone track', description: err.message, variant: 'destructive' });
    },
  });

  return {
    tracks: tracksQuery.data || [],
    isLoading: tracksQuery.isLoading,
    error: tracksQuery.error,
    refetch: tracksQuery.refetch,
    createTrack: createTrack.mutateAsync,
    updateTrack: updateTrack.mutateAsync,
    archiveTrack: archiveTrack.mutateAsync,
    cloneTrack: cloneTrack.mutateAsync,
    isCreating: createTrack.isPending,
    isUpdating: updateTrack.isPending,
    isArchiving: archiveTrack.isPending,
    isCloning: cloneTrack.isPending,
  };
}

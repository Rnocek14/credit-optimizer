import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CareerTrack, CreateTrackInput, UpdateTrackInput } from '@/types/tracks';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/authHelper';
import { slugify, generateUniqueSlug } from '@/lib/slugify';
import {
  fetchProfileId,
  fetchCareerTracks,
  fetchTrackSlugs,
  insertCareerTrack,
  updateCareerTrack,
  cloneCareerTrack,
} from '@/shared/lib/api/tracks';

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

      const profileId = await fetchProfileId(user.id);
      if (!profileId) {
        console.log('[useTracks] No profile found for user, returning empty array');
        return [];
      }

      console.log('[useTracks] Profile ID:', profileId);
      const data = await fetchCareerTracks(profileId);
      console.log('[useTracks] Tracks fetched:', data.length, 'tracks');
      return data as CareerTrack[];
    },
  });

  const createTrack = useMutation({
    mutationFn: async (input: CreateTrackInput) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const baseSlug = slugify(input.track_name);
      const existingSlugs = await fetchTrackSlugs(user.id);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

      const data = await insertCareerTrack({
        user_id: user.id,
        track_name: input.track_name,
        title: input.track_name,
        slug: uniqueSlug,
        goal: input.goal || null,
        icon: input.icon || null,
        color: input.color || null,
        archived: false,
        order_index: 0,
      });

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

  const updateTrackMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateTrackInput }) => {
      const data = await updateCareerTrack(id, patch as Record<string, unknown>);
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
      const data = await updateCareerTrack(id, { archived });
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

  const cloneTrackMut = useMutation({
    mutationFn: async ({ sourceTrackId, newName, icon, color }: { sourceTrackId: string; newName: string; icon?: string | null; color?: string | null; }) => {
      return cloneCareerTrack({ sourceTrackId, newName, icon, color });
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
    updateTrack: updateTrackMut.mutateAsync,
    archiveTrack: archiveTrack.mutateAsync,
    cloneTrack: cloneTrackMut.mutateAsync,
    isCreating: createTrack.isPending,
    isUpdating: updateTrackMut.isPending,
    isArchiving: archiveTrack.isPending,
    isCloning: cloneTrackMut.isPending,
  };
}

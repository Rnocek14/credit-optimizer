/**
 * API module for career tracks CRUD + clone.
 */
import { supabase } from './client';

export async function fetchProfileId(authUserId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function fetchCareerTracks(profileId: string) {
  const { data, error } = await supabase
    .from('career_tracks')
    .select('*')
    .eq('user_id', profileId)
    .order('archived', { ascending: true })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchTrackSlugs(userId: string) {
  const { data, error } = await supabase
    .from('career_tracks')
    .select('slug')
    .eq('user_id', userId)
    .not('slug', 'is', null);

  if (error) throw error;
  return (data || []).map(t => t.slug).filter(Boolean) as string[];
}

export async function insertCareerTrack(row: {
  user_id: string;
  track_name: string;
  title: string;
  slug: string;
  goal?: string | null;
  icon?: string | null;
  color?: string | null;
  archived?: boolean;
  order_index?: number;
}) {
  const { data, error } = await supabase
    .from('career_tracks')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCareerTrack(
  id: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('career_tracks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cloneCareerTrack(params: {
  sourceTrackId: string;
  newName: string;
  icon?: string | null;
  color?: string | null;
}) {
  const { data, error } = await supabase.rpc('clone_career_track', {
    source_track_id: params.sourceTrackId,
    new_track_name: params.newName,
    new_icon: params.icon ?? null,
    new_color: params.color ?? null,
  });

  if (error) throw error;
  return data as string; // new track id
}

import { supabase } from '@/integrations/supabase/client';
import { TRACK_MAP, type TrackId } from './trackDefinitions';

export async function resolveTrackBlockIds(trackKey: TrackId) {
  const track = TRACK_MAP.get(trackKey);
  if (!track) {
    throw new Error(`Unknown track: ${trackKey}`);
  }

  const desired = new Set(track.blockIds);
  const { data, error } = await supabase
    .from('requirement_blocks')
    .select('id,slug');

  if (error) throw new Error(`Block lookup failed: ${error.message}`);

  const map = new Map<string, string>(); // slug -> id
  (data || []).forEach(b => map.set(String(b.slug), String(b.id)));

  const blockIds: string[] = [];
  const missing: string[] = [];

  for (const slug of desired) {
    const id = map.get(slug);
    id ? blockIds.push(id) : missing.push(slug);
  }

  console.log(`[Resolve ${trackKey}]`, { 
    desired: track.blockIds, 
    resolved: blockIds.length, 
    missing: missing.length > 0 ? missing : 'none' 
  });

  return { 
    name: track.name, 
    blockIds, 
    missingSlugs: missing 
  };
}
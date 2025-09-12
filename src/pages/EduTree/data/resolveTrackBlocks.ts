import { supabase } from '@/integrations/supabase/client';
import { trackBySlug } from './trackDefinitions';

export type TrackKey = 'software-engineering' | 'data-science' | 'cybersecurity';

export async function resolveTrackBlockIds(trackKey: TrackKey) {
  const desired = new Set(trackBySlug[trackKey].slugs);
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
    desired: trackBySlug[trackKey].slugs, 
    resolved: blockIds.length, 
    missing: missing.length > 0 ? missing : 'none' 
  });

  return { 
    name: trackBySlug[trackKey].name, 
    blockIds, 
    missingSlugs: missing 
  };
}
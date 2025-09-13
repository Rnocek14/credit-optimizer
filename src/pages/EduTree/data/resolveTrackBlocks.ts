import { supabase } from '@/integrations/supabase/client';

export type TrackKey = 'software-engineering' | 'data-science' | 'cybersecurity';

export const trackByTitle: Record<TrackKey, { name: string; blockTitles: string[] }> = {
  'software-engineering': {
    name: 'Software Engineering',
    blockTitles: [
      'Foundations',
      'Mathematics', 
      'General Education',
      'Core I',
      'Core II',
      'Architecture',
      'Capstone'
    ]
  },
  'data-science': {
    name: 'Data Science',
    blockTitles: [
      'Foundations',
      'Mathematics',
      'General Education', 
      'Core I',
      'Specializations',
      'Web Development',
      'Capstone'
    ]
  },
  'cybersecurity': {
    name: 'Cybersecurity',
    blockTitles: [
      'Foundations',
      'Mathematics',
      'General Education',
      'Core I',
      'Mobile Development',
      'Architecture',
      'Capstone'
    ]
  }
};

export async function resolveTrackBlockIds(trackKey: TrackKey) {
  const desired = new Set(trackByTitle[trackKey].blockTitles.map(t => t.trim().toLowerCase()));
  const { data, error } = await supabase
    .from('requirement_blocks')
    .select('id,title');

  if (error) throw new Error(`Block lookup failed: ${error.message}`);

  const map = new Map<string, string>(); // titleLower -> id
  data?.forEach(b => map.set(String(b.title).trim().toLowerCase(), b.id));

  const blockIds: string[] = [];
  const missing: string[] = [];
  for (const title of desired) {
    const id = map.get(title);
    id ? blockIds.push(id) : missing.push(title);
  }

  return {
    name: trackByTitle[trackKey].name,
    blockIds,                   // UUIDs for overlay edge/id generation
    missingTitles: missing      // helpful for logs
  };
}
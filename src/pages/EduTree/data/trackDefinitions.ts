export type TrackKey = 'software-engineering' | 'data-science' | 'cybersecurity';

export const trackBySlug: Record<TrackKey, { name: string; slugs: string[] }> = {
  'software-engineering': {
    name: 'Software Engineering',
    slugs: ['foundations', 'mathematics', 'general-education', 'core-i', 'core-ii', 'architecture', 'capstone']
  },
  'data-science': {
    name: 'Data Science',
    slugs: ['foundations', 'mathematics', 'general-education', 'core-i', 'specializations', 'web-development', 'capstone']
  },
  'cybersecurity': {
    name: 'Cybersecurity',
    slugs: ['foundations', 'mathematics', 'general-education', 'core-i', 'mobile-development', 'architecture', 'capstone']
  }
};

// Guard edge-IDs at source - enforce block-based IDs
export const eid = (s: string, t: string) => `e-${String(s)}-${String(t)}`;

export function generateEdgeIds(blockSequence: string[]): string[] {
  return blockSequence.slice(0, -1).map((src, i) => eid(src, blockSequence[i + 1]));
}
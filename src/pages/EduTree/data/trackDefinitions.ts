export type TrackId = string;

export interface TrackDefinition {
  id: TrackId;
  name: string;
  description?: string;
  color?: string;
  blockIds: string[]; // ordered block ids (using slugs)
}

// Track definitions using block slugs
export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    description: 'Full-stack development track',
    color: '#3b82f6',
    blockIds: [
      'foundations',
      'mathematics', 
      'general-education',
      'core-i',
      'core-ii',
      'specializations',
      'architecture',
      'capstone-software-engineering',
      'degree-completion'
    ]
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Analytics and machine learning track',
    color: '#10b981',
    blockIds: [
      'foundations',
      'mathematics',
      'general-education', 
      'core-i',
      'core-ii',
      'data-analysis',
      'machine-learning',
      'capstone-data-science',
      'degree-completion'
    ]
  }
];

export const TRACK_MAP = new Map(TRACK_DEFINITIONS.map(t => [t.id, t]));

// Helper to get track by ID with fallback
export function getTrackById(id: TrackId): TrackDefinition | undefined {
  return TRACK_MAP.get(id);
}

// Helper to get all track IDs
export function getAllTrackIds(): TrackId[] {
  return TRACK_DEFINITIONS.map(t => t.id);
}
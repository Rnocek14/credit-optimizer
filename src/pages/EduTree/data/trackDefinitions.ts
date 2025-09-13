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
      'architecture',
      'capstone'
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
      'data-analysis',
      'machine-learning',
      'capstone'
    ]
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Security and risk management track',
    color: '#f59e0b',
    blockIds: [
      'foundations',
      'mathematics',
      'general-education',
      'core-i',
      'security-fundamentals',
      'advanced-security',
      'capstone'
    ]
  },
  {
    id: 'mobile-development',
    name: 'Mobile Development', 
    description: 'iOS and Android development track',
    color: '#8b5cf6',
    blockIds: [
      'foundations',
      'mathematics',
      'general-education',
      'core-i',
      'mobile-frameworks',
      'advanced-mobile',
      'capstone'
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
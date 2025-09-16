export type TrackId = string;

export interface TrackDefinition {
  id: TrackId;
  name: string;
  description?: string;
  color?: string;
  blockIds: string[]; // ordered block ids (using slugs)
}

// Track definitions using block slugs - Academic Year Structure
export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    description: 'Full-stack development track with strong foundation in computer science principles',
    color: '#3b82f6',
    blockIds: [
      // Year 1: Foundation
      'foundations',
      'mathematics', 
      'general-education',
      // Year 2: Core
      'core-i',
      // Year 3: Specialization (SE Track)
      'core-ii',
      'specializations',
      'architecture',
      // Year 4: Capstone & Degree
      'capstone-software-engineering',
      'degree-completion-software-engineering'
    ]
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Analytics and machine learning track with emphasis on statistical modeling',
    color: '#10b981',
    blockIds: [
      // Year 1: Foundation (Shared)
      'foundations',
      'mathematics',
      'general-education', 
      // Year 2: Core (Shared)
      'core-i',
      // Year 3: Specialization (DS Track)
      'data-analysis',
      'machine-learning',
      // Year 4: Capstone & Degree
      'capstone-data-science',
      'degree-completion-data-science'
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
export type TrackId = string;

export interface TrackDefinition {
  id: TrackId;
  name: string;
  description?: string;
  color?: string;
  blockIds: string[]; // ordered block ids (using slugs)
}

// Track definitions aligned with actual seed data
export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    description: 'Full-stack development track',
    color: '#3b82f6',
    blockIds: [
      'foundations',          // y1-found
      'mathematics',          // y1-math 
      'general-education',    // y1-genedAB
      'core-i',              // y2-cs-core (CS program)
      'program-electives',   // y2-cs-elec 
      'core-ii',             // y3-se-core (SE track)
      'track-electives',     // y3-se-elec
      'capstone'             // y4-se-cap
    ]
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Analytics and machine learning track',
    color: '#10b981',
    blockIds: [
      'foundations',          // y1-found
      'mathematics',          // y1-math
      'general-education',    // y1-genedAB
      'core-i',              // y2-cs-core (CS program)
      'program-electives',   // y2-cs-elec
      'core-ii',             // y3-ds-core (DS track)
      'track-electives',     // y3-ds-elec
      'capstone'             // y4-ds-cap
    ]
  },
  {
    id: 'information-technology',
    name: 'Information Technology',
    description: 'IT infrastructure and systems track',
    color: '#f59e0b',
    blockIds: [
      'foundations',          // y1-found
      'mathematics',          // y1-math
      'general-education',    // y1-genedAB
      'core-i',              // y2-it-core (IT program)
      'program-electives',   // y2-it-elec
      'capstone'             // y4-it-cap
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
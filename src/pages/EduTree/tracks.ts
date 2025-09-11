// tracks.ts - Enhanced for proper branching visualization
export type TrackId = 'web' | 'data' | 'systems';

export interface TrackDefinition {
  name: string;
  nodes: string[];
  sharedFoundation: string[]; // shared until branching point
  uniqueNodes: string[]; // track-specific after branching
  branchingPoint: string; // where tracks diverge
  convergencePoint: string; // where all tracks merge (degree)
  specialization: string; // track focus area
}

export const TRACKS: Record<TrackId, TrackDefinition> = {
  web: {
    name: 'Web Frontend',
    nodes: ['b101','b201','b202','b301','b311','degree-completion'],
    sharedFoundation: ['b101','b201','b202'], // shared until branching
    uniqueNodes: ['b301','b311'], // web-specific specialization
    branchingPoint: 'b202', // Programming II - where tracks diverge
    convergencePoint: 'degree-completion', // all tracks converge here
    specialization: 'Web Development & UI/UX',
  },
  data: {
    name: 'Data Analytics', 
    nodes: ['b102','b201','b202','b302','b321','degree-completion'],
    sharedFoundation: ['b102','b201','b202'], // shared foundation (note: b102 instead of b101)
    uniqueNodes: ['b302','b321'], // data-specific specialization
    branchingPoint: 'b202', // Programming II - where tracks diverge
    convergencePoint: 'degree-completion', // all tracks converge here
    specialization: 'Data Science & Analytics',
  },
  systems: {
    name: 'Systems & DevOps',
    nodes: ['b401','b201','b202','b331','degree-completion'],
    sharedFoundation: ['b401','b201','b202'], // shared foundation (note: b401 start)
    uniqueNodes: ['b331'], // systems-specific specialization
    branchingPoint: 'b202', // Programming II - where tracks diverge  
    convergencePoint: 'degree-completion', // all tracks converge here
    specialization: 'Infrastructure & Operations',
  },
};
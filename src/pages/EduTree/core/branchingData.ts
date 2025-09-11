/**
 * Core branching data structure for Y-shaped educational tree visualization
 * This defines the foundation, branching points, and convergence for all tracks
 */

export interface BranchingNode {
  id: string;
  title: string;
  area: 'foundation' | 'branching' | 'specialization' | 'convergence';
  level_year: number;
  position: { x: number; y: number };
  tracks: string[]; // which tracks include this node
  prerequisiteIds: string[];
  isShared: boolean; // true if multiple tracks share this node
}

export interface BranchingEdge {
  id: string;
  sourceId: string;
  targetId: string;
  tracks: string[]; // which tracks use this edge
  isShared: boolean; // true if multiple tracks share this edge
}

export interface BranchingStructure {
  nodes: BranchingNode[];
  edges: BranchingEdge[];
  foundationNodes: string[];
  branchingPoint: string;
  convergencePoint: string;
  trackSpecializations: Record<string, string[]>;
}

/**
 * Core branching structure for Software Engineering degree
 * This creates a proper Y-shaped tree where tracks branch and converge
 */
export const BRANCHING_STRUCTURE: BranchingStructure = {
  nodes: [
    // Foundation Layer (shared by all tracks before branching)
    {
      id: 'b101',
      title: 'Composition & Writing',
      area: 'foundation',
      level_year: 1,
      position: { x: 100, y: 150 },
      tracks: ['web', 'data', 'systems'],
      prerequisiteIds: [],
      isShared: true
    },
    {
      id: 'b102', 
      title: 'Quantitative Reasoning',
      area: 'foundation',
      level_year: 1,
      position: { x: 100, y: 250 },
      tracks: ['data'], // Only data track needs this
      prerequisiteIds: [],
      isShared: false
    },
    {
      id: 'b401',
      title: 'Mathematics for CS',
      area: 'foundation', 
      level_year: 1,
      position: { x: 100, y: 350 },
      tracks: ['systems'], // Only systems track needs this
      prerequisiteIds: [],
      isShared: false
    },
    {
      id: 'b201',
      title: 'Programming Fundamentals I',
      area: 'foundation',
      level_year: 1,
      position: { x: 420, y: 200 },
      tracks: ['web', 'data', 'systems'],
      prerequisiteIds: ['b101', 'b102', 'b401'], // All foundation paths lead here
      isShared: true
    },

    // Branching Point (where tracks diverge)
    {
      id: 'b202',
      title: 'Programming Fundamentals II',
      area: 'branching',
      level_year: 2,
      position: { x: 740, y: 200 },
      tracks: ['web', 'data', 'systems'],
      prerequisiteIds: ['b201'],
      isShared: true
    },

    // Specialization Layer (track-specific branches)
    {
      id: 'b301',
      title: 'Web Frontend Foundations',
      area: 'specialization',
      level_year: 2,
      position: { x: 1060, y: 100 },
      tracks: ['web'],
      prerequisiteIds: ['b202'],
      isShared: false
    },
    {
      id: 'b302',
      title: 'Data Analytics Foundations',
      area: 'specialization',
      level_year: 2,
      position: { x: 1060, y: 200 },
      tracks: ['data'],
      prerequisiteIds: ['b202'],
      isShared: false
    },
    {
      id: 'b331',
      title: 'Systems & Infrastructure',
      area: 'specialization',
      level_year: 2,
      position: { x: 1060, y: 300 },
      tracks: ['systems'],
      prerequisiteIds: ['b202'],
      isShared: false
    },
    {
      id: 'b311',
      title: 'Advanced Web Development',
      area: 'specialization',
      level_year: 3,
      position: { x: 1380, y: 100 },
      tracks: ['web'],
      prerequisiteIds: ['b301'],
      isShared: false
    },
    {
      id: 'b321',
      title: 'Advanced Data Analytics',
      area: 'specialization',
      level_year: 3,
      position: { x: 1380, y: 200 },
      tracks: ['data'],
      prerequisiteIds: ['b302'],
      isShared: false
    },

    // Convergence Point (all tracks merge here)
    {
      id: 'degree-completion',
      title: 'B.S. Software Engineering',
      area: 'convergence',
      level_year: 4,
      position: { x: 1700, y: 200 },
      tracks: ['web', 'data', 'systems'],
      prerequisiteIds: ['b311', 'b321', 'b331'],
      isShared: true
    }
  ],

  edges: [
    // Foundation to Convergence Edges
    { id: 'e1', sourceId: 'b101', targetId: 'b201', tracks: ['web', 'data', 'systems'], isShared: true },
    { id: 'e2', sourceId: 'b102', targetId: 'b201', tracks: ['data'], isShared: false },
    { id: 'e3', sourceId: 'b401', targetId: 'b201', tracks: ['systems'], isShared: false },
    { id: 'e4', sourceId: 'b201', targetId: 'b202', tracks: ['web', 'data', 'systems'], isShared: true },

    // Branching Edges (from branching point to specializations)
    { id: 'e5', sourceId: 'b202', targetId: 'b301', tracks: ['web'], isShared: false },
    { id: 'e6', sourceId: 'b202', targetId: 'b302', tracks: ['data'], isShared: false },
    { id: 'e7', sourceId: 'b202', targetId: 'b331', tracks: ['systems'], isShared: false },

    // Specialization Progression Edges
    { id: 'e8', sourceId: 'b301', targetId: 'b311', tracks: ['web'], isShared: false },
    { id: 'e9', sourceId: 'b302', targetId: 'b321', tracks: ['data'], isShared: false },

    // Convergence Edges (all specializations lead to degree)
    { id: 'e10', sourceId: 'b311', targetId: 'degree-completion', tracks: ['web'], isShared: false },
    { id: 'e11', sourceId: 'b321', targetId: 'degree-completion', tracks: ['data'], isShared: false },
    { id: 'e12', sourceId: 'b331', targetId: 'degree-completion', tracks: ['systems'], isShared: false },
  ],

  foundationNodes: ['b101', 'b102', 'b401', 'b201'],
  branchingPoint: 'b202',
  convergencePoint: 'degree-completion',
  trackSpecializations: {
    web: ['b301', 'b311'],
    data: ['b302', 'b321'],
    systems: ['b331']
  }
};

/**
 * Get nodes for a specific track based on branching structure
 */
export function getTrackNodesFromStructure(trackId: string): Set<string> {
  return new Set(
    BRANCHING_STRUCTURE.nodes
      .filter(node => node.tracks.includes(trackId))
      .map(node => node.id)
  );
}

/**
 * Get edges for a specific track based on branching structure
 */
export function getTrackEdgesFromStructure(trackId: string): Set<string> {
  return new Set(
    BRANCHING_STRUCTURE.edges
      .filter(edge => edge.tracks.includes(trackId))
      .map(edge => edge.id)
  );
}

/**
 * Get shared nodes between two tracks
 */
export function getSharedNodesFromStructure(track1: string, track2: string): Set<string> {
  return new Set(
    BRANCHING_STRUCTURE.nodes
      .filter(node => node.tracks.includes(track1) && node.tracks.includes(track2))
      .map(node => node.id)
  );
}

/**
 * Get unique nodes for a track (not shared with another track)
 */
export function getUniqueNodesFromStructure(trackId: string, comparisonTrack: string): Set<string> {
  return new Set(
    BRANCHING_STRUCTURE.nodes
      .filter(node => 
        node.tracks.includes(trackId) && 
        !node.tracks.includes(comparisonTrack)
      )
      .map(node => node.id)
  );
}

/**
 * Check if a node is a branching point
 */
export function isBranchingPointFromStructure(nodeId: string): boolean {
  const node = BRANCHING_STRUCTURE.nodes.find(n => n.id === nodeId);
  return node?.area === 'branching' || nodeId === BRANCHING_STRUCTURE.branchingPoint;
}

/**
 * Check if a node is a convergence point
 */
export function isConvergencePointFromStructure(nodeId: string): boolean {
  const node = BRANCHING_STRUCTURE.nodes.find(n => n.id === nodeId);
  return node?.area === 'convergence' || nodeId === BRANCHING_STRUCTURE.convergencePoint;
}
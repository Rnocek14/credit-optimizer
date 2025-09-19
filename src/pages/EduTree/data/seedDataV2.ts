/**
 * Clean Slate EduTree V2 - Golden Layout Seed Data
 * Manual positioning for perfect branching demonstration
 */

export interface V2RequirementBlock {
  id: string;
  program_id?: string;
  track_id?: string | null;
  title: string;
  rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
  level_year: number;
  area: string;
  credits_needed?: number;
  position_x: number;
  position_y: number;
  is_virtual?: boolean;
}

export interface Junction {
  id: string;
  level_year: number;
  junction_type: 'program' | 'track';
  title: string;
  position_x: number;
  position_y: number;
  outputs: Array<{
    id: string;
    lane: 'up' | 'down';
  }>;
}

export type EdgeKind = 'gate' | 'prereq' | 'coreq' | 'advisory';

export interface V2Edge {
  source: string;
  target: string;
  kind?: EdgeKind; // Educational edge type for styling and behavior
}

// Coordinate constants for consistent positioning
export const LAYOUT_CONSTANTS = {
  YEAR_COLUMNS: { Y1: 200, Y2: 600, Y3: 1300, Y4: 1700 },
  GATE_POSITIONS: { 
    Y1_TO_Y2: 400,  // Program gate after Y1
    Y2_TO_Y3: 900   // Track gate after Y2
  },
  LANE_ROWS: {
    GATE_Y: 360,
    UP_CORE: 240, UP_ELECTIVES: 120, UP_CAPSTONE: 80,
    DOWN_CORE: 480, DOWN_ELECTIVES: 600, DOWN_CAPSTONE: 640
  }
};

/**
 * Multi-gate layout - demonstrates Y1→ProgramGate→Y2(CS|IT)→TrackGate→Y3(SE|DS)→Y4
 * Supports both program-level and track-level branching
 */
export const GOLDEN_LAYOUT_SEED: {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
  junctions: Junction[];
} = {
  blocks: [
    // Year 1 - Shared Foundation (All Programs)
    {
      id: "y1-found",
      title: "Foundations",
      rule_type: "ALL",
      level_year: 1,
      area: "foundation",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y1,
      position_y: 100
    },
    {
      id: "y1-math",
      title: "Math I",
      rule_type: "ALL",
      level_year: 1,
      area: "core",
      credits_needed: 3,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y1,
      position_y: 300
    },
    {
      id: "y1-genedAB",
      title: "Gen Ed A/B",
      rule_type: "ALL",
      level_year: 1,
      area: "gen_ed",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y1,
      position_y: 500
    },

    // Year 2 - Computer Science Program (Upper Lane)
    {
      id: "y2-cs-core",
      program_id: "bs_cs",
      title: "CS Core",
      rule_type: "ALL",
      level_year: 2,
      area: "core",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_CORE
    },
    {
      id: "y2-cs-elec",
      program_id: "bs_cs",
      title: "CS Electives",
      rule_type: "K_OF_N",
      level_year: 2,
      area: "elective_pool",
      credits_needed: 3,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_ELECTIVES
    },

    // Year 2 - Information Technology Program (Lower Lane)
    {
      id: "y2-it-core",
      program_id: "bs_it",
      title: "IT Core",
      rule_type: "ALL",
      level_year: 2,
      area: "core",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_CORE
    },
    {
      id: "y2-it-elec",
      program_id: "bs_it",
      title: "IT Electives",
      rule_type: "K_OF_N",
      level_year: 2,
      area: "elective_pool",
      credits_needed: 3,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_ELECTIVES
    },

    // Track Gates (Virtual Nodes)
    {
      id: "gate-y2-programs",
      title: "Program Gate",
      rule_type: "ALL",
      level_year: 2,
      area: "support",
      position_x: LAYOUT_CONSTANTS.GATE_POSITIONS.Y1_TO_Y2,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.GATE_Y,
      is_virtual: true
    },
    {
      id: "gate-y3-tracks",
      title: "Track Gate",
      rule_type: "ALL",
      level_year: 3,
      area: "support",
      position_x: LAYOUT_CONSTANTS.GATE_POSITIONS.Y2_TO_Y3,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.GATE_Y,
      is_virtual: true
    },

    // Year 3 - CS Tracks: Software Engineering (Upper Lane)
    {
      id: "y3-se-core",
      program_id: "bs_cs",
      track_id: "se",
      title: "SE Core",
      rule_type: "ALL",
      level_year: 3,
      area: "track_core",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y3,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_CORE
    },
    {
      id: "y3-se-elec",
      program_id: "bs_cs",
      track_id: "se",
      title: "SE Electives (pick 2)",
      rule_type: "K_OF_N",
      level_year: 3,
      area: "elective_pool",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y3,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_ELECTIVES
    },

    // Year 3 - CS Tracks: Data Science (Lower Lane)
    {
      id: "y3-ds-core",
      program_id: "bs_cs",
      track_id: "ds",
      title: "DS Core",
      rule_type: "ALL",
      level_year: 3,
      area: "track_core",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y3,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_CORE
    },
    {
      id: "y3-ds-elec",
      program_id: "bs_cs",
      track_id: "ds",
      title: "DS Electives (pick 2)",
      rule_type: "K_OF_N",
      level_year: 3,
      area: "elective_pool",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y3,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_ELECTIVES
    },

    // Year 4 - Capstones
    {
      id: "y4-se-cap",
      program_id: "bs_cs",
      track_id: "se",
      title: "SE Capstone",
      rule_type: "ALL",
      level_year: 4,
      area: "capstone",
      credits_needed: 3,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y4,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_CAPSTONE
    },
    {
      id: "y4-ds-cap",
      program_id: "bs_cs",
      track_id: "ds",
      title: "DS Capstone",
      rule_type: "ALL",
      level_year: 4,
      area: "capstone",
      credits_needed: 3,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y4,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_CAPSTONE
    },
    {
      id: "y4-it-cap",
      program_id: "bs_it",
      title: "IT Capstone",
      rule_type: "ALL",
      level_year: 4,
      area: "capstone",
      credits_needed: 3,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y4,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.DOWN_CAPSTONE
    }
  ],

  edges: [
    // Y1 → Program Gate
    { source: "y1-found", target: "gate-y2-programs" },
    { source: "y1-math", target: "gate-y2-programs" },
    { source: "y1-genedAB", target: "gate-y2-programs" },
    
    // Program Gate → Y2 Programs
    { source: "gate-y2-programs", target: "y2-cs-core" },
    { source: "gate-y2-programs", target: "y2-it-core" },
    
    // Y2 Program Connections
    { source: "y2-cs-core", target: "y2-cs-elec" },
    { source: "y2-it-core", target: "y2-it-elec" },
    
    // CS Program → Track Gate
    { source: "y2-cs-core", target: "gate-y3-tracks" },
    { source: "y2-cs-elec", target: "gate-y3-tracks" },
    
    // Track Gate → Y3 CS Tracks
    { source: "gate-y3-tracks", target: "y3-se-core" },
    { source: "gate-y3-tracks", target: "y3-ds-core" },
    
    // Y3 Track Connections
    { source: "y3-se-core", target: "y3-se-elec" },
    { source: "y3-ds-core", target: "y3-ds-elec" },
    
    // Y3 → Y4 Capstones
    { source: "y3-se-elec", target: "y4-se-cap" },
    { source: "y3-ds-elec", target: "y4-ds-cap" },
    { source: "y2-it-elec", target: "y4-it-cap" },
    
    // Gate-to-Header edges for compare modes (straight arrows)
    { source: "gate-y2-programs", target: "program-header:bs_cs", kind: "gate" },
    { source: "gate-y2-programs", target: "program-header:bs_it", kind: "gate" },
    { source: "gate-y3-tracks", target: "track-header:se", kind: "gate" },
    { source: "gate-y3-tracks", target: "track-header:ds", kind: "gate" }
  ],

  junctions: [
    {
      id: "gate-y2-programs",
      level_year: 2,
      junction_type: "program",
      title: "Program Gate",
      position_x: LAYOUT_CONSTANTS.GATE_POSITIONS.Y1_TO_Y2,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.GATE_Y,
      outputs: [
        { id: "bs_cs", lane: "up" },
        { id: "bs_it", lane: "down" }
      ]
    },
    {
      id: "gate-y3-tracks",
      level_year: 3,
      junction_type: "track",
      title: "Track Gate",
      position_x: LAYOUT_CONSTANTS.GATE_POSITIONS.Y2_TO_Y3,
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.GATE_Y,
      outputs: [
        { id: "se", lane: "up" },
        { id: "ds", lane: "down" }
      ]
    }
  ]
};

/**
 * Enhanced filtering logic for programs and tracks
 */
export type FilterMode = 'compare-programs' | 'compare-tracks' | 'bs_cs' | 'bs_it' | 'se' | 'ds' | null;

export function filterBlocksByMode(
  blocks: V2RequirementBlock[], 
  filterMode: FilterMode
): V2RequirementBlock[] {
  if (!filterMode) return blocks;
  
  switch (filterMode) {
    case 'compare-programs':
      // Show Y1 shared + Y2 program-only + program gate (exclude track-level content)
      return blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        (block.program_id && !block.track_id) || // Y2 program-only blocks (CS Core/Electives, IT Core/Electives)
        (block.is_virtual && block.id === 'gate-y2-programs') // Program gate only
      );
      
    case 'compare-tracks':
      // Show CS program + both tracks + track gate (hide program gate)
      return blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bs_cs' ||
        (block.is_virtual && block.id === 'gate-y3-tracks')
      );
      
    case 'bs_cs':
      // Show Y1 + CS program + track gate + both CS tracks
      return blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bs_cs' ||
        (block.is_virtual && (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks'))
      );
      
    case 'bs_it':
      // Show Y1 + IT program only
      return blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bs_it' ||
        (block.is_virtual && block.id === 'gate-y2-programs')
      );
      
    case 'se':
      // Show Y1 + CS program + SE track
      return blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        (block.program_id === 'bs_cs' && !block.track_id) || // CS program blocks
        block.track_id === 'se' ||
        (block.is_virtual && (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks'))
      );
      
    case 'ds':
      // Show Y1 + CS program + DS track
      return blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        (block.program_id === 'bs_cs' && !block.track_id) || // CS program blocks
        block.track_id === 'ds' ||
        (block.is_virtual && (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks'))
      );
      
    default:
      return blocks;
  }
}

// Legacy function for backward compatibility
export function filterBlocksByTrack(
  blocks: V2RequirementBlock[], 
  trackFilter: 'se' | 'ds' | 'compare' | null
): V2RequirementBlock[] {
  if (trackFilter === 'compare') return filterBlocksByMode(blocks, 'compare-tracks');
  return filterBlocksByMode(blocks, trackFilter);
}

/**
 * Filter edges based on visible blocks
 */
export function filterEdgesByBlocks(
  edges: V2Edge[],
  visibleBlocks: V2RequirementBlock[]
): V2Edge[] {
  const visibleBlockIds = new Set(visibleBlocks.map(b => b.id));
  
  return edges.filter(edge => {
    // Source must be visible
    if (!visibleBlockIds.has(edge.source)) return false;
    
    // Special case: header targets are always considered "visible" when their mode is active
    // Headers are not blocks but are created dynamically in manualLayoutRenderer
    if (edge.target.startsWith('program-header:') || edge.target.startsWith('track-header:')) {
      return true; // Headers are handled by the renderer's filter mode logic
    }
    
    // Regular case: target must be in visible blocks
    return visibleBlockIds.has(edge.target);
  });
}
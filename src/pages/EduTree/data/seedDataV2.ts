/**
 * Clean Slate EduTree V2 - Golden Layout Seed Data
 * Manual positioning for perfect branching demonstration
 */

export interface V2RequirementBlock {
  id: string;
  program_id: string;
  track_id: string | null;
  title: string;
  rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
  level_year: number;
  area: string;
  credits_needed?: number;
  position_x: number;
  position_y: number;
  is_virtual?: boolean;
}

export interface V2Edge {
  source: string;
  target: string;
}

/**
 * Minimal golden layout - demonstrates perfect Y1→Y2→Gate→Y3(SE|DS)→Y4 branching
 * Fixed coordinates that never change, proving the visual concept works
 */
export const GOLDEN_LAYOUT_SEED: {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
} = {
  blocks: [
    // Year 1 - Shared Foundation
    {
      id: "y1-found",
      program_id: "bs_cs",
      track_id: null,
      title: "Foundations",
      rule_type: "ALL",
      level_year: 1,
      area: "foundation",
      credits_needed: 6,
      position_x: 200,
      position_y: 100
    },
    {
      id: "y1-math",
      program_id: "bs_cs", 
      track_id: null,
      title: "Math I",
      rule_type: "ALL",
      level_year: 1,
      area: "core",
      credits_needed: 3,
      position_x: 200,
      position_y: 300
    },
    {
      id: "y1-gened",
      program_id: "bs_cs",
      track_id: null, 
      title: "Gen Ed A/B",
      rule_type: "ALL",
      level_year: 1,
      area: "gen_ed",
      credits_needed: 6,
      position_x: 200,
      position_y: 500
    },

    // Year 2 - Shared Core
    {
      id: "y2-core1",
      program_id: "bs_cs",
      track_id: null,
      title: "Core I", 
      rule_type: "ALL",
      level_year: 2,
      area: "core",
      credits_needed: 3,
      position_x: 600,
      position_y: 180
    },
    {
      id: "y2-core2", 
      program_id: "bs_cs",
      track_id: null,
      title: "Core II",
      rule_type: "ALL", 
      level_year: 2,
      area: "core",
      credits_needed: 3,
      position_x: 600,
      position_y: 360
    },
    {
      id: "y2-gened",
      program_id: "bs_cs",
      track_id: null,
      title: "Gen Ed C",
      rule_type: "ALL",
      level_year: 2, 
      area: "gen_ed",
      credits_needed: 6,
      position_x: 600,
      position_y: 540
    },

    // Divergence Gate - Virtual Node
    {
      id: "divergence-gate",
      program_id: "bs_cs",
      track_id: null,
      title: "Track Gate",
      rule_type: "ALL",
      level_year: 3,
      area: "support", 
      position_x: 900,
      position_y: 360,
      is_virtual: true
    },

    // Year 3 - Software Engineering Track
    {
      id: "y3-se-core",
      program_id: "bs_cs",
      track_id: "se",
      title: "SE Core",
      rule_type: "ALL",
      level_year: 3,
      area: "track_core",
      credits_needed: 6,
      position_x: 1200,
      position_y: 220
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
      position_x: 1200,
      position_y: 420
    },

    // Year 3 - Data Science Track  
    {
      id: "y3-ds-core",
      program_id: "bs_cs",
      track_id: "ds", 
      title: "DS Core",
      rule_type: "ALL",
      level_year: 3,
      area: "track_core",
      credits_needed: 6,
      position_x: 1500,
      position_y: 220
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
      position_x: 1500,
      position_y: 420
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
      position_x: 1800,
      position_y: 320
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
      position_x: 2100,
      position_y: 320
    }
  ],

  edges: [
    // Y1 → Y2 connections
    { source: "y1-found", target: "y2-core1" },
    { source: "y1-math", target: "y2-core1" },
    { source: "y1-gened", target: "y2-core2" },
    
    // Y2 → Divergence Gate
    { source: "y2-core1", target: "divergence-gate" },
    { source: "y2-core2", target: "divergence-gate" }, 
    { source: "y2-gened", target: "divergence-gate" },
    
    // Gate → Y3 Track Specialization
    { source: "divergence-gate", target: "y3-se-core" },
    { source: "divergence-gate", target: "y3-ds-core" },
    
    // Y3 → Y3 Within Tracks
    { source: "y3-se-core", target: "y3-se-elec" },
    { source: "y3-ds-core", target: "y3-ds-elec" },
    
    // Y3 → Y4 Capstones
    { source: "y3-se-elec", target: "y4-se-cap" },
    { source: "y3-ds-elec", target: "y4-ds-cap" }
  ]
};

/**
 * Track filtering logic for different views
 */
export function filterBlocksByTrack(
  blocks: V2RequirementBlock[], 
  trackFilter: 'se' | 'ds' | 'compare' | null
): V2RequirementBlock[] {
  if (!trackFilter || trackFilter === 'compare') {
    return blocks; // Show all blocks in compare mode
  }
  
  return blocks.filter(block => 
    block.track_id === null || // Always show shared blocks  
    block.track_id === trackFilter || // Show blocks for selected track
    block.is_virtual // Always show virtual nodes like gates
  );
}

/**
 * Filter edges based on visible blocks
 */
export function filterEdgesByBlocks(
  edges: V2Edge[],
  visibleBlocks: V2RequirementBlock[]
): V2Edge[] {
  const visibleBlockIds = new Set(visibleBlocks.map(b => b.id));
  
  return edges.filter(edge => 
    visibleBlockIds.has(edge.source) && visibleBlockIds.has(edge.target)
  );
}
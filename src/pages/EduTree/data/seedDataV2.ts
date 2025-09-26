/**
 * Clean Slate EduTree V2 - Golden Layout Seed Data
 * Manual positioning for perfect branching demonstration
 */

import { PROGRAM_DEFINITIONS, getProgramById, doesProgramSkipYear } from './programMetadata';
import { normalizeProgramCompareLanes } from "../utils/laneNormalize";
import { LAYOUT_CONSTANTS } from '../utils/layoutConstants';

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
  is_empty_year?: boolean; // New flag for ghost nodes
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
// LAYOUT_CONSTANTS moved to ../utils/layoutConstants.ts to avoid circular imports

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
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_TRACK_A
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
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_TRACK_A
    },

    // Year 3 - CS Tracks: Data Science (Upper Track B Lane)
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
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_TRACK_B
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
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_TRACK_B
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
      position_y: LAYOUT_CONSTANTS.LANE_ROWS.UP_CAPSTONE
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
    },

    // Bachelor of Science in Nursing (BSN) Program - Cross-discipline comparison data
    {
      id: "y1-bsn-found",
      program_id: "bsn",
      title: "Nursing Foundation",
      rule_type: "ALL",
      level_year: 1,
      area: "foundation",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y1,
      position_y: 700
    },
    {
      id: "y2-bsn-core",
      program_id: "bsn",
      title: "Clinical Foundations",
      rule_type: "ALL",
      level_year: 2,
      area: "core",
      credits_needed: 9,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y2,
      position_y: 700
    },
    {
      id: "y3-bsn-clinical",
      program_id: "bsn",
      title: "Clinical Practice",
      rule_type: "ALL",
      level_year: 3,
      area: "clinical",
      credits_needed: 12,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y3,
      position_y: 700
    },
    {
      id: "y4-bsn-capstone",
      program_id: "bsn",
      title: "Nursing Capstone",
      rule_type: "ALL",
      level_year: 4,
      area: "capstone",
      credits_needed: 6,
      position_x: LAYOUT_CONSTANTS.YEAR_COLUMNS.Y4,
      position_y: 700
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
    
    // BSN Program progression
    { source: "y1-bsn-found", target: "y2-bsn-core" },
    { source: "y2-bsn-core", target: "y3-bsn-clinical" },
    { source: "y3-bsn-clinical", target: "y4-bsn-capstone" },
    
    // Removed hard-wired gate-to-header edges - dropdown is source of truth
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
        { id: "ds", lane: "up" }
      ]
    }
  ]
};

/**
 * Enhanced filtering logic for programs and tracks
 */
export type FilterMode = 'compare-programs' | 'compare-tracks' | 'compare-any' | 'bs_cs' | 'bs_it' | 'bsn' | 'se' | 'ds' | null;

// Helper to check if a program has tracks
const hasTracks = (programId?: string) => programId === 'bs_cs';

export function filterBlocksByMode(
  blocks: V2RequirementBlock[], 
  filterMode: FilterMode,
  opts?: { programs?: string[] }
): V2RequirementBlock[] {
  if (!filterMode) return blocks;
  
  // Read selected programs if provided (fallback to discovering in-filter)
  const selectedPrograms = new Set(opts?.programs ?? []);
  
  // Helper function to check if a program is selected
  const inSelected = (pid?: string) =>
    !pid || selectedPrograms.size === 0 || selectedPrograms.has(pid);
  
  // First apply existing filtering logic
  let filteredBlocks: V2RequirementBlock[];
  
  switch (filterMode) {
    case 'compare-programs':
      // Show Y1 shared + Y2 program-only + track content for programs with tracks + both gates
      filteredBlocks = blocks.filter(block => {
        const isY1Shared = !block.program_id;
        
        // ONLY include program-level blocks for selected programs
        const isProgramLevel = !!block.program_id && !block.track_id && inSelected(block.program_id);
        
        // ONLY include track nodes for selected programs that actually have tracks
        const isTrackLevelOfSelectedProgram =
          !!block.program_id &&
          !!block.track_id &&
          selectedPrograms.has(block.program_id) &&
          hasTracks(block.program_id);
        
        // keep both Program + Track gates visible
        const isGate =
          block.is_virtual &&
          (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks');
        
        return isY1Shared || isProgramLevel || isTrackLevelOfSelectedProgram || isGate;
      });
      
      // Inject ghost nodes before lane normalization for program comparisons
      if (selectedPrograms.size > 0) {
        console.log('[FilterBlocks] Program comparison detected in compare-programs:', Array.from(selectedPrograms));
        
        // Debug: Show what programs are present after filtering
        const programCounts = filteredBlocks.reduce((acc, b) => {
          const pid = b.program_id ?? 'shared';
          acc[pid] = (acc[pid] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[FilterBlocks] programs present after filtering:', programCounts);
        
        // Debug: Check for existing ghost nodes
        const existingGhosts = filteredBlocks.filter(b => b.id.startsWith('empty-year-'));
        if (existingGhosts.length) {
          console.warn('[FilterBlocks] ghost nodes present pre-injection:', existingGhosts.map(g => g.id));
        }
        
        // Only inject ghosts for SELECTED programs that need ghost nodes
        const selectedProgramsList = Array.from(selectedPrograms);
        const programsNeedingGhosts = selectedProgramsList.filter(pid => {
          const program = getProgramById(pid);
          return !!program && (program.skips?.length ?? 0) > 0;
        });
        
        console.log('[GhostInject] compare-programs mode:', { 
          selectedPrograms: selectedProgramsList, 
          programsNeedingGhosts 
        });
        filteredBlocks = injectGhostNodes(filteredBlocks, programsNeedingGhosts);
      }
      
      // Normalize lanes: CS (upper with SE/DS split), IT (lower)
      try {
        filteredBlocks = normalizeProgramCompareLanes(filteredBlocks, selectedPrograms);
      } catch (error) {
        console.error('[Lane Normalizer] Error:', error);
        // Fallback: return filtered blocks without normalization
      }
      break;
      
    case 'compare-tracks':
      // Show CS program + both tracks + track gate (hide program gate)
      filteredBlocks = blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bs_cs' ||
        (block.is_virtual && block.id === 'gate-y3-tracks')
      );
      break;
      
    case 'bs_cs':
      // Show Y1 + CS program + track gate + both CS tracks
      filteredBlocks = blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bs_cs' ||
        (block.is_virtual && (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks'))
      );
      break;
      
    case 'bs_it':
      // Show Y1 + IT program only
      filteredBlocks = blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bs_it' ||
        (block.is_virtual && block.id === 'gate-y2-programs')
      );
      break;
      
    case 'se':
      // Show Y1 + CS program + SE track
      filteredBlocks = blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        (block.program_id === 'bs_cs' && !block.track_id) || // CS program blocks
        block.track_id === 'se' ||
        (block.is_virtual && (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks'))
      );
      break;
      
    case 'ds':
      // Show Y1 + CS program + DS track
      filteredBlocks = blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        (block.program_id === 'bs_cs' && !block.track_id) || // CS program blocks
        block.track_id === 'ds' ||
        (block.is_virtual && (block.id === 'gate-y2-programs' || block.id === 'gate-y3-tracks'))
      );
      break;
      
    case 'bsn':
      // Show Y1 + BSN program blocks
      filteredBlocks = blocks.filter(block => 
        !block.program_id || // Y1 shared blocks
        block.program_id === 'bsn' ||
        (block.is_virtual && block.id === 'gate-y2-programs')
      );
      break;
      
    case 'compare-any':
      // Show all blocks for dual selection comparisons
      filteredBlocks = blocks;
      
      // Filter to only selected programs if specified
      if (selectedPrograms.size > 0) {
        filteredBlocks = filteredBlocks.filter(
          b => !b.program_id || selectedPrograms.has(b.program_id) || b.is_virtual
        );
      }
      
      // Apply same program comparison logic as compare-programs mode
      if (selectedPrograms.size > 0) {
        console.log('[FilterBlocks] Program comparison detected in compare-any mode:', Array.from(selectedPrograms));
        
        // Debug: Show what programs are present after filtering
        const programCounts = filteredBlocks.reduce((acc, b) => {
          const pid = b.program_id ?? 'shared';
          acc[pid] = (acc[pid] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[FilterBlocks] programs present after filtering:', programCounts);
        
        // Debug: Check for existing ghost nodes
        const existingGhosts = filteredBlocks.filter(b => b.id.startsWith('empty-year-'));
        if (existingGhosts.length) {
          console.warn('[FilterBlocks] ghost nodes present pre-injection:', existingGhosts.map(g => g.id));
        }
        
        // Only inject ghosts for SELECTED programs that need ghost nodes
        const selectedProgramsList = Array.from(selectedPrograms);
        const programsNeedingGhosts = selectedProgramsList.filter(pid => {
          const program = getProgramById(pid);
          return !!program && (program.skips?.length ?? 0) > 0;
        });
        
        console.log('[GhostInject] compare-any mode:', { 
          selectedPrograms: selectedProgramsList, 
          programsNeedingGhosts 
        });
        filteredBlocks = injectGhostNodes(filteredBlocks, programsNeedingGhosts);
        
        // Apply lane normalization: CS upper band, IT lower band
        try {
          filteredBlocks = normalizeProgramCompareLanes(filteredBlocks, selectedPrograms);
        } catch (error) {
          console.error('[Lane Normalizer] Error in compare-any mode:', error);
          // Fallback: return filtered blocks without normalization
        }
      }
      break;
      
    default:
      filteredBlocks = blocks;
  }
  
  // Ghost nodes are now injected during program comparisons above
  // For other modes, inject ghost nodes for any active programs that need them
  if (!['compare-programs', 'compare-any'].includes(filterMode) || selectedPrograms.size === 0) {
    const activePrograms = getActivePrograms(filteredBlocks);
    filteredBlocks = injectGhostNodes(filteredBlocks, activePrograms);
  }
  
  // Final safety prune: ensure only selected programs and valid ghosts survive
  if (selectedPrograms.size > 0) {
    filteredBlocks = pruneBlocksForSelection(filteredBlocks, selectedPrograms);
  }
  
  return filteredBlocks;
}

/**
 * Final prune to ensure only selected programs and valid ghosts survive
 */
function pruneBlocksForSelection(
  blocks: V2RequirementBlock[],
  selectedPrograms: Set<string>
): V2RequirementBlock[] {
  const keep = (b: V2RequirementBlock) => {
    // Keep Y1 shared + gates
    if (!b.program_id || b.is_virtual) return true;

    // Keep only selected programs
    if (!selectedPrograms.has(b.program_id)) return false;

    // Keep ghosts only if the program actually skips years
    if (b.id.startsWith('empty-year-')) {
      const meta = getProgramById(b.program_id);
      return !!meta && (meta.skips?.length ?? 0) > 0;
    }
    return true;
  };

  const pruned = blocks.filter(keep);
  // Optional: tag dropped ids for debug HUD
  (pruned as any)._droppedIds = blocks.filter(b => !keep(b)).map(b => b.id);
  return pruned;
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
 * Get active programs from filtered blocks
 */
export function getActivePrograms(blocks: V2RequirementBlock[]): string[] {
  const programs = new Set<string>();
  
  for (const block of blocks) {
    if (block.program_id) {
      programs.add(block.program_id);
    }
  }
  
  return Array.from(programs);
}

/**
 * Inject ghost nodes for skipped years in programs
 */
export function injectGhostNodes(
  blocks: V2RequirementBlock[],
  activePrograms: string[]
): V2RequirementBlock[] {
  const ghostNodes: V2RequirementBlock[] = [];
  
  // Check each active program for skipped years
  for (const programId of activePrograms) {
    const program = getProgramById(programId);
    if (!program || program.skips.length === 0) continue;
    
    console.log(`[GhostNodes] Checking program ${programId} for skipped years:`, program.skips);
    
    for (const skippedYear of program.skips) {
      const ghostId = `empty-year-${programId}-y${skippedYear}`;
      
      // Check if ghost node already exists
      if (blocks.some(b => b.id === ghostId)) continue;
      
      // Determine position based on program and year
      const position = getGhostNodePosition(programId, skippedYear);
      
      const ghostNode: V2RequirementBlock = {
        id: ghostId,
        program_id: programId,
        title: `No Year ${skippedYear} Coursework`,
        rule_type: 'ALL',
        level_year: skippedYear,
        area: 'ghost',
        position_x: position.x,
        position_y: position.y,
        is_empty_year: true,
        credits_needed: 0
      };
      
      console.log(`[GhostNodes] Created ghost node:`, ghostNode);
      ghostNodes.push(ghostNode);
    }
  }
  
  return [...blocks, ...ghostNodes];
}

/**
 * Get position for ghost node based on program and year
 */
function getGhostNodePosition(programId: string, year: number): { x: number; y: number } {
  const yearColumns = LAYOUT_CONSTANTS.YEAR_COLUMNS;
  const laneRows = LAYOUT_CONSTANTS.LANE_ROWS;
  
  // X position based on year
  const x = yearColumns[`Y${year}` as keyof typeof yearColumns] || yearColumns.Y3;
  
  // Y position based on program (lane assignment)
  let y: number;
  if (programId === 'bs_it') {
    // IT uses lower lane
    y = laneRows.DOWN_CORE;
  } else if (programId === 'bs_cs') {
    // CS uses upper lane
    y = laneRows.UP_CORE;
  } else {
    // Default to gate row
    y = laneRows.GATE_Y;
  }
  
  return { x, y };
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
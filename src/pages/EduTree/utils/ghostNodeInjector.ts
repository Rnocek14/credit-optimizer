/**
 * Ghost Node Injection - Add empty year nodes for skipped academic years
 * Handles cases like IT skipping Year 3 (Y1→Y2→Y4)
 */

import { V2RequirementBlock, LAYOUT_CONSTANTS } from '../data/seedDataV2';
import { doesProgramSkipYear, getProgramById } from '../data/programMetadata';
import type { EmptyYearNodeData } from '../components/EmptyYearNode';

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
 * Create ghost node data for ReactFlow
 */
export function createGhostNodeData(
  programId: string,
  year: number,
  nextYear?: number
): EmptyYearNodeData {
  const program = getProgramById(programId);
  
  // Determine reason based on program characteristics
  let reason: EmptyYearNodeData['reason'] = 'direct-progression';
  if (program?.durationYears === 3) {
    reason = 'accelerated';
  } else if (!program?.hasTracks && year === 3) {
    reason = 'no-track';
  }
  
  return {
    year,
    programId,
    reason,
    nextYear,
    programName: program?.name
  };
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
 * Add continuation edges for ghost nodes
 */
export function addGhostNodeEdges(
  blocks: V2RequirementBlock[],
  existingEdges: any[]
): any[] {
  const newEdges = [...existingEdges];
  
  // Find ghost nodes and their continuation patterns
  const ghostNodes = blocks.filter(b => b.is_empty_year);
  
  for (const ghost of ghostNodes) {
    // For IT Y3 ghost, add Y2→Ghost and Ghost→Y4 edges
    if (ghost.program_id === 'bs_it' && ghost.level_year === 3) {
      // Find Y2 IT blocks
      const y2ItBlocks = blocks.filter(b => 
        b.program_id === 'bs_it' && 
        b.level_year === 2 && 
        !b.is_virtual && 
        !b.is_empty_year
      );
      
      // Find Y4 IT capstone
      const y4ItBlock = blocks.find(b => 
        b.program_id === 'bs_it' && 
        b.level_year === 4 && 
        !b.is_virtual && 
        !b.is_empty_year
      );
      
      // Add edges from Y2 blocks to ghost
      for (const y2Block of y2ItBlocks) {
        newEdges.push({
          source: y2Block.id,
          target: ghost.id,
          kind: 'advisory' // Dashed line for ghost connections
        });
      }
      
      // Add edge from ghost to Y4 capstone
      if (y4ItBlock) {
        newEdges.push({
          source: ghost.id,
          target: y4ItBlock.id,
          kind: 'advisory' // Dashed line for ghost connections
        });
      }
    }
  }
  
  console.log(`[GhostNodes] Added ${newEdges.length - existingEdges.length} ghost edges`);
  return newEdges;
}
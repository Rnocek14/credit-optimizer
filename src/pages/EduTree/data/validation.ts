/**
 * EduTree Data Validation Utilities
 * 
 * Comprehensive validation system to catch data model mismatches
 * and ensure the integrity of track definitions, seed data, and mappings.
 */

import { TRACK_DEFINITIONS, getAllTrackIds } from './trackDefinitions';
import { GOLDEN_LAYOUT_SEED, filterBlocksByMode, type FilterMode } from './seedDataV2';
import { validateSlugMappings, resolveBlockIds, getAllSeedBlockIds } from './blockMapping';
import { type GatePositions } from '../utils/divergence';

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    tracksChecked: number;
    blocksChecked: number;
    mappingsChecked: number;
    filterModesChecked: number;
  };
}

/**
 * Run comprehensive validation of EduTree data model
 */
export function validateEduTreeDataModel(gatePositions?: GatePositions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log('[EduTree Validation] Starting comprehensive data model validation...');
  
  // 1. Validate slug mappings
  console.log('[EduTree Validation] Checking slug mappings...');
  const mappingResult = validateSlugMappings();
  errors.push(...mappingResult.errors);
  warnings.push(...mappingResult.warnings);
  
  // 2. Validate track definitions against seed data
  console.log('[EduTree Validation] Checking track definitions...');
  const trackValidation = validateTrackDefinitions();
  errors.push(...trackValidation.errors);
  warnings.push(...trackValidation.warnings);
  
  // 3. Validate filter modes
  console.log('[EduTree Validation] Checking filter modes...');
  const filterValidation = validateFilterModes();
  errors.push(...filterValidation.errors);
  warnings.push(...filterValidation.warnings);
  
  // 4. Validate block consistency
  console.log('[EduTree Validation] Checking block consistency...');
  const blockValidation = validateBlockConsistency();
  errors.push(...blockValidation.errors);
  warnings.push(...blockValidation.warnings);
  
  // 5. Validate gate coherency if gate positions provided
  if (gatePositions) {
    console.log('[EduTree Validation] Checking gate coherency...');
    const gateValidation = validateGateCoherency(gatePositions);
    errors.push(...gateValidation.errors);
    warnings.push(...gateValidation.warnings);
  }
  
  const result: ValidationResult = {
    success: errors.length === 0,
    errors,
    warnings,
    summary: {
      tracksChecked: TRACK_DEFINITIONS.length,
      blocksChecked: GOLDEN_LAYOUT_SEED.blocks.length,
      mappingsChecked: Object.keys(validateSlugMappings()).length,
      filterModesChecked: 6 // compare-programs, compare-tracks, bs_cs, bs_it, se, ds
    }
  };
  
  // Log results
  if (result.success) {
    console.log('[EduTree Validation] ✅ All validations passed!', result.summary);
  } else {
    console.error('[EduTree Validation] ❌ Validation failed:', {
      errors: result.errors,
      warnings: result.warnings
    });
  }
  
  return result;
}

/**
 * Validate track definitions can be resolved to actual blocks
 */
function validateTrackDefinitions(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const track of TRACK_DEFINITIONS) {
    // Create appropriate context for each track
    const context = {
      programId: track.id === 'information-technology' ? 'bs_it' : 'bs_cs',
      trackId: track.id === 'software-engineering' ? 'se' : 
               track.id === 'data-science' ? 'ds' : undefined
    };
    
    const { resolved, missing } = resolveBlockIds(track.blockIds, context);
    
    if (missing.length > 0) {
      errors.push(`Track '${track.name}' references missing slugs: ${missing.join(', ')}`);
    }
    
    if (resolved.length === 0) {
      errors.push(`Track '${track.name}' resolved to zero blocks`);
    }
    
    if (resolved.length !== track.blockIds.length) {
      warnings.push(`Track '${track.name}' expected ${track.blockIds.length} blocks but resolved ${resolved.length}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Validate filter modes produce sensible results
 */
function validateFilterModes(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const testModes: FilterMode[] = ['compare-programs', 'compare-tracks', 'bs_cs', 'bs_it', 'se', 'ds'];
  
  for (const mode of testModes) {
    const filtered = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, mode);
    
    if (filtered.length === 0) {
      errors.push(`Filter mode '${mode}' produces no blocks`);
      continue;
    }
    
    // Mode-specific validations
    switch (mode) {
      case 'compare-programs':
        // Should have Y1 + Y2 program blocks + program gate, NO track blocks
        const hasTrackBlocks = filtered.some(b => b.track_id);
        if (hasTrackBlocks) {
          errors.push(`Filter mode 'compare-programs' should not include track-specific blocks`);
        }
        
        const hasProgramGate = filtered.some(b => b.id === 'gate-y2-programs');
        if (!hasProgramGate) {
          warnings.push(`Filter mode 'compare-programs' missing program gate`);
        }
        break;
        
      case 'compare-tracks':
        // Should have Y1 + CS program + both tracks + track gate, NO program gate
        const hasNonCSProgram = filtered.some(b => b.program_id && b.program_id !== 'bs_cs');
        if (hasNonCSProgram) {
          errors.push(`Filter mode 'compare-tracks' should only include CS program blocks`);
        }
        
        const hasTrackGate = filtered.some(b => b.id === 'gate-y3-tracks');
        if (!hasTrackGate) {
          warnings.push(`Filter mode 'compare-tracks' missing track gate`);
        }
        break;
        
      case 'bs_cs':
        // Should have Y1 + CS program + both tracks + both gates
        const hasOnlyCS = filtered.every(b => !b.program_id || b.program_id === 'bs_cs');
        if (!hasOnlyCS) {
          errors.push(`Filter mode 'bs_cs' should only include CS program blocks`);
        }
        break;
        
      case 'bs_it':
        // Should have Y1 + IT program + program gate, NO track content
        const hasITTrackContent = filtered.some(b => b.track_id);
        if (hasITTrackContent) {
          errors.push(`Filter mode 'bs_it' should not include track-specific blocks`);
        }
        break;
        
      case 'se':
      case 'ds':
        // Should have Y1 + CS program + specific track + both gates
        const expectedTrackId = mode;
        const hasWrongTrack = filtered.some(b => b.track_id && b.track_id !== expectedTrackId);
        if (hasWrongTrack) {
          errors.push(`Filter mode '${mode}' includes blocks from wrong track`);
        }
        break;
    }
  }
  
  return { errors, warnings };
}

/**
 * Validate block data consistency
 */
function validateBlockConsistency(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const blocks = GOLDEN_LAYOUT_SEED.blocks;
  
  // Check Year 1 invariant: no program_id or track_id
  const y1BadProgram = blocks.filter(b => b.level_year === 1 && b.program_id);
  const y1BadTrack = blocks.filter(b => b.level_year === 1 && b.track_id);
  
  if (y1BadProgram.length > 0) {
    errors.push(`Year 1 blocks must not have program_id: ${y1BadProgram.map(b => b.id).join(', ')}`);
  }
  
  if (y1BadTrack.length > 0) {
    errors.push(`Year 1 blocks must not have track_id: ${y1BadTrack.map(b => b.id).join(', ')}`);
  }
  
  // Check that Year 2 blocks have program_id but no track_id (except IT which has no tracks)
  const y2NoProgram = blocks.filter(b => b.level_year === 2 && !b.program_id && !b.is_virtual);
  const y2WithTrack = blocks.filter(b => b.level_year === 2 && b.track_id);
  
  if (y2NoProgram.length > 0) {
    errors.push(`Year 2 non-virtual blocks must have program_id: ${y2NoProgram.map(b => b.id).join(', ')}`);
  }
  
  if (y2WithTrack.length > 0) {
    warnings.push(`Year 2 blocks typically should not have track_id: ${y2WithTrack.map(b => b.id).join(', ')}`);
  }
  
  // Check cross-program edge consistency
  const edges = GOLDEN_LAYOUT_SEED.edges;
  const crossProgramEdges = edges.filter(edge => {
    const sourceBlock = blocks.find(b => b.id === edge.source);
    const targetBlock = blocks.find(b => b.id === edge.target);
    
    if (!sourceBlock || !targetBlock || sourceBlock.is_virtual) return false;
    
    return sourceBlock.program_id && 
           targetBlock.program_id && 
           sourceBlock.program_id !== targetBlock.program_id;
  });
  
  if (crossProgramEdges.length > 0) {
    errors.push(`Found cross-program edges (should use gates): ${crossProgramEdges.map(e => `${e.source}->${e.target}`).join(', ')}`);
  }
  
  return { errors, warnings };
}

/**
 * Validate gate coherency - gates should only appear when divergence exists
 */
function validateGateCoherency(gatePositions: GatePositions): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Program Gate validation
  if (gatePositions.showPG) {
    const programGateEdges = GOLDEN_LAYOUT_SEED.edges.filter(e => e.source === 'gate-y2-programs');
    const invalidPGEdges = programGateEdges.filter(e => 
      !e.target.startsWith('program-header:') && 
      !GOLDEN_LAYOUT_SEED.blocks.find(b => b.id === e.target && b.program_id)
    );
    
    if (invalidPGEdges.length > 0) {
      errors.push(`Program gate shown but ${invalidPGEdges.length} edge(s) don't target program-scoped blocks: ${invalidPGEdges.map(e => e.target).join(', ')}`);
    }
  } else {
    const programGateEdges = GOLDEN_LAYOUT_SEED.edges.filter(e => e.source === 'gate-y2-programs');
    if (programGateEdges.length > 0) {
      warnings.push(`Program gate hidden but ${programGateEdges.length} edge(s) still reference it: ${programGateEdges.map(e => e.target).join(', ')}`);
    }
  }

  // Track Gate validation
  if (gatePositions.showTG) {
    const trackGateEdges = GOLDEN_LAYOUT_SEED.edges.filter(e => e.source === 'gate-y3-tracks');
    const invalidTGEdges = trackGateEdges.filter(e => 
      !e.target.startsWith('track-header:') && 
      !GOLDEN_LAYOUT_SEED.blocks.find(b => b.id === e.target && b.track_id)
    );
    
    if (invalidTGEdges.length > 0) {
      errors.push(`Track gate shown but ${invalidTGEdges.length} edge(s) don't target track-scoped blocks: ${invalidTGEdges.map(e => e.target).join(', ')}`);
    }
  } else {
    const trackGateEdges = GOLDEN_LAYOUT_SEED.edges.filter(e => e.source === 'gate-y3-tracks');
    if (trackGateEdges.length > 0) {
      warnings.push(`Track gate hidden but ${trackGateEdges.length} edge(s) still reference it: ${trackGateEdges.map(e => e.target).join(', ')}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Development utility to log validation results in a readable format
 */
export function logValidationResults(result: ValidationResult) {
  console.group('[EduTree Validation Results]');
  
  console.log('Summary:', result.summary);
  
  if (result.errors.length > 0) {
    console.group('❌ Errors:');
    result.errors.forEach((error, i) => console.error(`${i + 1}. ${error}`));
    console.groupEnd();
  }
  
  if (result.warnings.length > 0) {
    console.group('⚠️ Warnings:');
    result.warnings.forEach((warning, i) => console.warn(`${i + 1}. ${warning}`));
    console.groupEnd();
  }
  
  if (result.success) {
    console.log('✅ All validations passed!');
  } else {
    console.log(`❌ Validation failed with ${result.errors.length} errors and ${result.warnings.length} warnings`);
  }
  
  console.groupEnd();
}

/**
 * Quick validation check for development
 */
export function quickValidationCheck(): boolean {
  const result = validateEduTreeDataModel();
  logValidationResults(result);
  return result.success;
}
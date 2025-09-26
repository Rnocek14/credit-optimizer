/**
 * EduTree V2 Data Hook - Clean slate data loading
 * Bypasses legacy systems when V2 flags are active
 */

import { useMemo } from 'react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { GOLDEN_LAYOUT_SEED, filterBlocksByMode, filterEdgesByBlocks, type V2RequirementBlock, type V2Edge, type FilterMode } from '../data/seedDataV2';
import { parseCompareUrl } from '../components/ComparePicker';

export interface UseEduTreeV2DataResult {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
  isLoading: boolean;
  isV2Mode: boolean;
  filterMode: FilterMode;
  effectiveFilterMode: FilterMode;
  isAutoMode: boolean;
  selectedPrograms: string[];
}

export function useEduTreeV2Data(filterMode: FilterMode = null): UseEduTreeV2DataResult {
  const flags = useFeatureFlags();
  
  const isV2Mode = flags.eduTreeV2Grid && flags.eduTreeLayoutMode === 'manual_v1';
  
  // Auto-detect program vs program comparison
  const { effectiveFilterMode, isAutoMode } = useMemo(() => {
    if (!filterMode || filterMode !== 'compare-any') {
      return { effectiveFilterMode: filterMode, isAutoMode: false };
    }
    
    // Parse URL selections to detect if both are programs
    const { primarySelection, secondarySelection } = parseCompareUrl();
    const bothPrograms = 
      primarySelection?.kind === 'program' && 
      secondarySelection?.kind === 'program';
    
    if (bothPrograms) {
      console.log('[EduTreeV2Data] Auto-detected program comparison, using compare-programs mode');
      return { effectiveFilterMode: 'compare-programs' as FilterMode, isAutoMode: true };
    }
    
    return { effectiveFilterMode: filterMode, isAutoMode: false };
  }, [filterMode]);
  
  // Extract selected programs once and reuse throughout
  // FIXED: Added URL search params as dependency to properly react to URL changes
  const selectedPrograms = useMemo(() => {
    const { primarySelection, secondarySelection } = parseCompareUrl();
    
    console.log('[EduTreeV2Data] DETAILED URL parsing debug:', {
      url: typeof window !== 'undefined' ? window.location.search : 'SSR',
      href: typeof window !== 'undefined' ? window.location.href : 'SSR',
      primarySelection,
      secondarySelection,
      effectiveFilterMode,
      primarySelectionValid: primarySelection?.kind === 'program',
      secondarySelectionValid: secondarySelection?.kind === 'program'
    });
    
    if (effectiveFilterMode?.includes('compare')) {
      const programs = [
        primarySelection?.kind === 'program' ? primarySelection.id : null,
        secondarySelection?.kind === 'program' ? secondarySelection.id : null
      ].filter(Boolean) as string[];
      console.log('[EduTreeV2Data] COMPARE MODE - Computed selectedPrograms:', {
        programs,
        primarySelection,
        secondarySelection,
        filterMode: effectiveFilterMode
      });
      return programs;
    } else {
      // For single-program modes, map filter mode to program ID
      const singleProgramResult = (() => {
        switch (effectiveFilterMode) {
          case 'bs_it':
            return ['bs_it'];
          case 'se':
            return ['bs_cs'];
          case 'ds':
            return ['bs_cs'];
          case 'bsn':
            return ['bsn'];
          default:
            // If no specific program mode, try to extract from URL anyway
            return [
              primarySelection?.kind === 'program' ? primarySelection.id : null
            ].filter(Boolean) as string[];
        }
      })();
      console.log('[EduTreeV2Data] SINGLE PROGRAM MODE - selectedPrograms:', {
        result: singleProgramResult,
        effectiveFilterMode,
        primarySelection
      });
      return singleProgramResult;
    }
  }, [effectiveFilterMode, typeof window !== 'undefined' ? window.location.search : '']);

  const { blocks, edges } = useMemo(() => {
    if (!isV2Mode) {
      return { blocks: [], edges: [] };
    }
    
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Using golden layout seed with filter mode:', effectiveFilterMode, isAutoMode ? '(auto-detected)' : '');
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Original filterMode:', filterMode, '→ effectiveFilterMode:', effectiveFilterMode);
    console.log('[EduTreeV2Data] Selected programs:', selectedPrograms);
    
    // DEBUG: Count IT nodes in original seed data
    const originalItNodes = GOLDEN_LAYOUT_SEED.blocks.filter(b => b.program_id === 'bs_it');
    console.log('[DEBUG] IT nodes in original seed data:', {
      count: originalItNodes.length,
      nodes: originalItNodes.map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id, level_year: n.level_year }))
    });
    
    // Apply enhanced filtering with selectedPrograms
    const filteredBlocks = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, effectiveFilterMode, { programs: selectedPrograms });
    
    // DEBUG: Count IT nodes after mode filtering
    const itNodesAfterFilter = filteredBlocks.filter(b => b.program_id === 'bs_it');
    console.log('[DEBUG] IT nodes after filterBlocksByMode:', {
      count: itNodesAfterFilter.length,
      nodes: itNodesAfterFilter.map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id, level_year: n.level_year }))
    });
    
    // GUARD A — Final whitelist: Remove any ghost for non-selected programs
    const selected = new Set(selectedPrograms);
    console.log('[GuardA] Pre-filter ghost check:', {
      selectedPrograms,
      selected: Array.from(selected),
      ghosts: filteredBlocks.filter(b => b.id?.startsWith('empty-year-')).map(g => ({ id: g.id, program_id: g.program_id }))
    });
    
    const blocksFinal = filteredBlocks.filter(b => {
      const isGhost = b.id?.startsWith('empty-year-') || (b as any).is_empty_year;
      if (!isGhost) return true;                         // allow normal nodes
      if (!b.program_id) return false;                   // never allow programless ghosts
      
      // CRITICAL: For single-program IT mode, ALWAYS allow IT ghost
      if (isGhost && b.program_id === 'bs_it' && selectedPrograms.includes('bs_it')) {
        console.log('[GuardA] EXPLICITLY allowing IT ghost in single-program mode:', b.id);
        return true;
      }
      
      return selected.has(b.program_id);                 // ONLY allow ghosts for selected programs
    });
    
    // DEBUG: Count IT nodes after ghost filtering
    const itNodesFinal = blocksFinal.filter(b => b.program_id === 'bs_it');
    console.log('[DEBUG] IT nodes after ghost filtering (final):', {
      count: itNodesFinal.length,
      nodes: itNodesFinal.map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id, level_year: n.level_year, position_y: n.position_y }))
    });
    
    console.log('[GuardA] Ghost filter applied:', {
      selected: Array.from(selected),
      effectiveFilterMode,
      ghostsFiltered: filteredBlocks.length - blocksFinal.length,
      before: filteredBlocks.filter(b => b.id?.startsWith('empty-year-')).map(g => ({ id: g.id, program_id: g.program_id })),
      after: blocksFinal.filter(b => b.id?.startsWith('empty-year-')).map(g => ({ id: g.id, program_id: g.program_id }))
    });
    
    const filteredEdges = filterEdgesByBlocks(GOLDEN_LAYOUT_SEED.edges, blocksFinal);
    
    // PHASE 5: Add table logging right before node creation to verify no Y3 track blocks survive
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Blocks after filtering:');
    console.table(blocksFinal.map(b => ({
      id: b.id,
      title: b.title?.slice(0, 30) + '...',
      year: b.level_year,
      program_id: b.program_id,
      track_id: b.track_id,
      type: b.rule_type
    })));
    
    console.log('[EduTreeV2Data] Filtered to', {
      blocks: blocksFinal.length,
      edges: filteredEdges.length,
      effectiveFilterMode,
      isAutoMode
    });
    
    return {
      blocks: blocksFinal,
      edges: filteredEdges
    };
  }, [isV2Mode, effectiveFilterMode, isAutoMode, selectedPrograms]);
  
  return {
    blocks,
    edges,
    isLoading: false, // No async loading in manual mode
    isV2Mode,
    filterMode,
    effectiveFilterMode,
    isAutoMode,
    selectedPrograms
  };
}
/**
 * EduTree V2 Data Hook - Clean slate data loading
 * Bypasses legacy systems when V2 flags are active
 */

import { useMemo } from 'react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { GOLDEN_LAYOUT_SEED, filterBlocksByMode, filterEdgesByBlocks, type V2RequirementBlock, type V2Edge, type FilterMode } from '../data/seedDataV2';
import { usePathHighlight } from '../ctx/PathHighlightContext';

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
  const pathHighlight = usePathHighlight();
  
  const isV2Mode = flags.eduTreeV2Grid && flags.eduTreeLayoutMode === 'manual_v1';
  
  // CRITICAL: Add early return if context is not ready in comparison modes
  const contextReady = useMemo(() => {
    // For comparison modes, we need at least one selection to be available
    if (filterMode === 'compare-any' || filterMode === 'compare-programs') {
      const hasSelections = !!(pathHighlight.primarySelection || pathHighlight.secondarySelection);
      console.log('[EduTreeV2Data] Context readiness check:', {
        filterMode,
        hasSelections,
        primarySelection: pathHighlight.primarySelection,
        secondarySelection: pathHighlight.secondarySelection,
        ready: hasSelections
      });
      return hasSelections;
    }
    // For non-comparison modes, we're always ready
    return true;
  }, [filterMode, pathHighlight.primarySelection, pathHighlight.secondarySelection]);
  
  // Early return with empty data if context is not ready
  if (!contextReady) {
    console.log('[EduTreeV2Data] Context not ready, returning empty data');
    return {
      blocks: [],
      edges: [],
      isLoading: true,
      isV2Mode,
      filterMode,
      effectiveFilterMode: filterMode,
      isAutoMode: false,
      selectedPrograms: []
    };
  }
  
  // Auto-detect program vs program comparison using context selections
  const { effectiveFilterMode, isAutoMode } = useMemo(() => {
    if (!filterMode || filterMode !== 'compare-any') {
      return { effectiveFilterMode: filterMode, isAutoMode: false };
    }
    
    // Use context selections instead of parsing URL directly
    const { primarySelection, secondarySelection } = pathHighlight;
    const bothPrograms = 
      primarySelection?.kind === 'program' && 
      secondarySelection?.kind === 'program';
    
    console.log('[EduTreeV2Data] Context-based auto-detection:', {
      primarySelection,
      secondarySelection,
      bothPrograms
    });
    
    if (bothPrograms) {
      console.log('[EduTreeV2Data] Auto-detected program comparison, using compare-programs mode');
      return { effectiveFilterMode: 'compare-programs' as FilterMode, isAutoMode: true };
    }
    
    return { effectiveFilterMode: filterMode, isAutoMode: false };
  }, [filterMode, pathHighlight.primarySelection, pathHighlight.secondarySelection]);
  
  // Extract selected programs using context selections instead of URL parsing
  const selectedPrograms = useMemo(() => {
    const { primarySelection, secondarySelection } = pathHighlight;
    
    console.log('[EduTreeV2Data] Context-based selection processing:', {
      primarySelection,
      secondarySelection,
      effectiveFilterMode,
      isAutoMode,
      contextReady: !!(primarySelection || secondarySelection),
      primarySelectionValid: primarySelection?.kind === 'program',
      secondarySelectionValid: secondarySelection?.kind === 'program',
      timestamp: new Date().toISOString()
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
      // For single-program modes, map filter mode to program ID or use context selection
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
            // If no specific program mode, use context selection
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
  }, [effectiveFilterMode, pathHighlight.primarySelection, pathHighlight.secondarySelection]);

  const { blocks, edges } = useMemo(() => {
    if (!isV2Mode) {
      return { blocks: [], edges: [] };
    }
    
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Using golden layout seed with filter mode:', effectiveFilterMode, isAutoMode ? '(auto-detected)' : '');
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Original filterMode:', filterMode, '→ effectiveFilterMode:', effectiveFilterMode);
    console.log('[EduTreeV2Data] Selected programs:', selectedPrograms);
    
    // DEBUG: Count both CS and IT nodes in original seed data
    const originalItNodes = GOLDEN_LAYOUT_SEED.blocks.filter(b => b.program_id === 'bs_it');
    const originalCsNodes = GOLDEN_LAYOUT_SEED.blocks.filter(b => b.program_id === 'bs_cs');
    console.log('[DEBUG] Original seed data node counts:', {
      IT: { count: originalItNodes.length, sample: originalItNodes.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))},
      CS: { count: originalCsNodes.length, sample: originalCsNodes.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))}
    });
    
    // Apply enhanced filtering with selectedPrograms
    const filteredBlocks = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, effectiveFilterMode, { programs: selectedPrograms });
    
    // DEBUG: Count both CS and IT nodes after mode filtering
    const itNodesAfterFilter = filteredBlocks.filter(b => b.program_id === 'bs_it');
    const csNodesAfterFilter = filteredBlocks.filter(b => b.program_id === 'bs_cs');
    console.log('[DEBUG] Nodes after filterBlocksByMode:', {
      IT: { count: itNodesAfterFilter.length, sample: itNodesAfterFilter.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))},
      CS: { count: csNodesAfterFilter.length, sample: csNodesAfterFilter.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, track_id: n.track_id }))},
      selectedPrograms,
      effectiveFilterMode
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
      
      // CRITICAL: For CS single-program modes, ALWAYS allow CS blocks and ghosts
      if (isGhost && b.program_id === 'bs_cs' && selectedPrograms.includes('bs_cs')) {
        console.log('[GuardA] EXPLICITLY allowing CS ghost in single-program mode:', b.id);
        return true;
      }
      
      // CRITICAL: For single-program IT mode, ALWAYS allow IT ghost
      if (isGhost && b.program_id === 'bs_it' && selectedPrograms.includes('bs_it')) {
        console.log('[GuardA] EXPLICITLY allowing IT ghost in single-program mode:', b.id);
        return true;
      }
      
      return selected.has(b.program_id);                 // ONLY allow ghosts for selected programs
    });
    
    // DEBUG: Count both CS and IT nodes after ghost filtering (final)
    const itNodesFinal = blocksFinal.filter(b => b.program_id === 'bs_it');
    const csNodesFinal = blocksFinal.filter(b => b.program_id === 'bs_cs');
    console.log('[DEBUG] Final node counts after all filtering:', {
      IT: { count: itNodesFinal.length, sample: itNodesFinal.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, position_y: n.position_y }))},
      CS: { count: csNodesFinal.length, sample: csNodesFinal.slice(0, 3).map(n => ({ id: n.id, program_id: n.program_id, position_y: n.position_y }))},
      totalBlocks: blocksFinal.length
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
    isLoading: false, // Only false when we have actual data
    isV2Mode,
    filterMode,
    effectiveFilterMode,
    isAutoMode,
    selectedPrograms
  };
}
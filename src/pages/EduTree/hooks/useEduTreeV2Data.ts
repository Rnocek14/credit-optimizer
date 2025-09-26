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
  
  const { blocks, edges } = useMemo(() => {
    if (!isV2Mode) {
      return { blocks: [], edges: [] };
    }
    
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Using golden layout seed with filter mode:', effectiveFilterMode, isAutoMode ? '(auto-detected)' : '');
    console.log('[EduTreeV2Data] PHASE 5 DEBUG - Original filterMode:', filterMode, '→ effectiveFilterMode:', effectiveFilterMode);
    
    // Extract selected programs for filter
    const { primarySelection, secondarySelection } = parseCompareUrl();
    
    // For compare modes, extract both programs
    let programs: string[] = [];
    if (effectiveFilterMode?.includes('compare')) {
      programs = [
        primarySelection?.kind === 'program' ? primarySelection.id : null,
        secondarySelection?.kind === 'program' ? secondarySelection.id : null
      ].filter(Boolean) as string[];
    } else {
      // For single-program modes, map filter mode to program ID
      switch (effectiveFilterMode) {
        case 'bs_it':
          programs = ['bs_it'];
          break;
        case 'se':
          programs = ['bs_cs'];
          break;
        case 'ds':
          programs = ['bs_cs'];
          break;
        case 'bsn':
          programs = ['bsn'];
          break;
        default:
          // If no specific program mode, try to extract from URL anyway
          programs = [
            primarySelection?.kind === 'program' ? primarySelection.id : null
          ].filter(Boolean) as string[];
      }
    }
    
    // Apply enhanced filtering
    const filteredBlocks = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, effectiveFilterMode, { programs });
    
    // GUARD A — Final whitelist: Remove any ghost for non-selected programs
    const selected = new Set(programs);
    const blocksFinal = filteredBlocks.filter(b => {
      const isGhost = b.id?.startsWith('empty-year-') || (b as any).is_empty_year;
      if (!isGhost) return true;                         // allow normal nodes
      if (!b.program_id) return false;                   // never allow programless ghosts
      return selected.has(b.program_id);                 // ONLY allow ghosts for selected programs
    });
    
    console.log('[GuardA] Ghost filter applied:', {
      selected: Array.from(selected),
      ghostsFiltered: filteredBlocks.length - blocksFinal.length,
      before: filteredBlocks.filter(b => b.id?.startsWith('empty-year-')).map(g => g.id),
      after: blocksFinal.filter(b => b.id?.startsWith('empty-year-')).map(g => g.id)
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
  }, [isV2Mode, effectiveFilterMode, isAutoMode]);
  
  return {
    blocks,
    edges,
    isLoading: false, // No async loading in manual mode
    isV2Mode,
    filterMode,
    effectiveFilterMode,
    isAutoMode
  };
}
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
    
    console.log('[EduTreeV2Data] Using golden layout seed with filter mode:', effectiveFilterMode, isAutoMode ? '(auto-detected)' : '');
    
    // Apply enhanced filtering
    const filteredBlocks = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, effectiveFilterMode);
    const filteredEdges = filterEdgesByBlocks(GOLDEN_LAYOUT_SEED.edges, filteredBlocks);
    
    console.log('[EduTreeV2Data] Filtered to', {
      blocks: filteredBlocks.length,
      edges: filteredEdges.length,
      effectiveFilterMode,
      isAutoMode
    });
    
    return {
      blocks: filteredBlocks,
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
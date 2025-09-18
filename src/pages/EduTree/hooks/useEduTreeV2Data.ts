/**
 * EduTree V2 Data Hook - Clean slate data loading
 * Bypasses legacy systems when V2 flags are active
 */

import { useMemo } from 'react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { GOLDEN_LAYOUT_SEED, filterBlocksByMode, filterEdgesByBlocks, type V2RequirementBlock, type V2Edge, type FilterMode } from '../data/seedDataV2';

export interface UseEduTreeV2DataResult {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
  isLoading: boolean;
  isV2Mode: boolean;
  filterMode: FilterMode;
}

export function useEduTreeV2Data(filterMode: FilterMode = null): UseEduTreeV2DataResult {
  const flags = useFeatureFlags();
  
  const isV2Mode = flags.eduTreeV2Grid && flags.eduTreeLayoutMode === 'manual_v1';
  
  const { blocks, edges } = useMemo(() => {
    if (!isV2Mode) {
      return { blocks: [], edges: [] };
    }
    
    console.log('[EduTreeV2Data] Using golden layout seed with filter mode:', filterMode);
    
    // Apply enhanced filtering
    const filteredBlocks = filterBlocksByMode(GOLDEN_LAYOUT_SEED.blocks, filterMode);
    const filteredEdges = filterEdgesByBlocks(GOLDEN_LAYOUT_SEED.edges, filteredBlocks);
    
    console.log('[EduTreeV2Data] Filtered to', {
      blocks: filteredBlocks.length,
      edges: filteredEdges.length,
      filterMode
    });
    
    return {
      blocks: filteredBlocks,
      edges: filteredEdges
    };
  }, [isV2Mode, filterMode]);
  
  return {
    blocks,
    edges,
    isLoading: false, // No async loading in manual mode
    isV2Mode,
    filterMode
  };
}
/**
 * EduTree V2 Data Hook - Clean slate data loading
 * Bypasses legacy systems when V2 flags are active
 */

import { useMemo } from 'react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { GOLDEN_LAYOUT_SEED, filterBlocksByTrack, filterEdgesByBlocks, type V2RequirementBlock, type V2Edge } from '../data/seedDataV2';

export interface UseEduTreeV2DataResult {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
  isLoading: boolean;
  isV2Mode: boolean;
  trackFilter: 'se' | 'ds' | 'compare' | null;
}

export function useEduTreeV2Data(trackFilter: 'se' | 'ds' | 'compare' | null = null): UseEduTreeV2DataResult {
  const flags = useFeatureFlags();
  
  const isV2Mode = flags.eduTreeV2Grid && flags.eduTreeLayoutMode === 'manual_v1';
  
  const { blocks, edges } = useMemo(() => {
    if (!isV2Mode) {
      return { blocks: [], edges: [] };
    }
    
    console.log('[EduTreeV2Data] Using golden layout seed with track filter:', trackFilter);
    
    // Apply track filtering
    const filteredBlocks = filterBlocksByTrack(GOLDEN_LAYOUT_SEED.blocks, trackFilter);
    const filteredEdges = filterEdgesByBlocks(GOLDEN_LAYOUT_SEED.edges, filteredBlocks);
    
    console.log('[EduTreeV2Data] Filtered to', {
      blocks: filteredBlocks.length,
      edges: filteredEdges.length,
      trackFilter
    });
    
    return {
      blocks: filteredBlocks,
      edges: filteredEdges
    };
  }, [isV2Mode, trackFilter]);
  
  return {
    blocks,
    edges,
    isLoading: false, // No async loading in manual mode
    isV2Mode,
    trackFilter
  };
}
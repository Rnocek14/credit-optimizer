/**
 * Suffix Compare Hook
 * Integrates suffix state with reachability computation
 */

import { useMemo } from 'react';
import { Edge } from '@xyflow/react';
import { useSuffixCompareStore } from '../state/useSuffixCompareStore';
import { buildAdjacency, reachableAfter, getGraphVersion } from '../utils/reachable';

interface UseSuffixCompareProps {
  edges: Edge[];
}

interface UseSuffixCompareResult {
  suffixState: {
    checkpointId: string | null;
    enabled: boolean;
  };
  reachableSet: Set<string> | null;
  setSuffix: (state: { checkpointId: string; enabled: boolean }) => void;
  clearSuffix: () => void;
}

export function useSuffixCompare({ edges }: UseSuffixCompareProps): UseSuffixCompareResult {
  const { checkpointId, enabled, setSuffix, clearSuffix } = useSuffixCompareStore();
  
  // Build adjacency map and compute reachable set
  const { adjacency, graphVersion } = useMemo(() => {
    const adj = buildAdjacency(edges);
    const version = getGraphVersion(edges);
    return { adjacency: adj, graphVersion: version };
  }, [edges]);
  
  // Compute reachable set when suffix is enabled
  const reachableSet = useMemo(() => {
    if (!enabled || !checkpointId) return null;
    
    return reachableAfter(checkpointId, adjacency, graphVersion);
  }, [enabled, checkpointId, adjacency, graphVersion]);
  
  // Expose reachable set for development debugging
  if (process.env.NODE_ENV === 'development') {
    (window as any).__suffixR__ = reachableSet;
  }
  
  return {
    suffixState: { checkpointId, enabled },
    reachableSet,
    setSuffix,
    clearSuffix
  };
}
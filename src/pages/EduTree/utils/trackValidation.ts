// Track validation utilities for debugging branching visualization
import { TRACKS, TrackId } from '../tracks';

/**
 * Validate track definitions for proper branching structure
 */
export function validateTrackDefinitions(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(TRACKS).forEach(([trackId, track]) => {
    // Check required fields
    if (!track.nodes || track.nodes.length === 0) {
      errors.push(`Track ${trackId}: No nodes defined`);
    }
    
    if (!track.branchingPoint) {
      errors.push(`Track ${trackId}: No branching point defined`);
    }
    
    if (!track.convergencePoint) {
      errors.push(`Track ${trackId}: No convergence point defined`);
    }
    
    // Check branching point is in shared foundation
    if (track.branchingPoint && !track.sharedFoundation.includes(track.branchingPoint)) {
      warnings.push(`Track ${trackId}: Branching point '${track.branchingPoint}' not in shared foundation`);
    }
    
    // Check convergence point is in nodes
    if (track.convergencePoint && !track.nodes.includes(track.convergencePoint)) {
      errors.push(`Track ${trackId}: Convergence point '${track.convergencePoint}' not in track nodes`);
    }
    
    // Check unique nodes don't overlap with shared foundation
    const sharedSet = new Set(track.sharedFoundation);
    const overlapping = track.uniqueNodes.filter(node => sharedSet.has(node));
    if (overlapping.length > 0) {
      warnings.push(`Track ${trackId}: Unique nodes overlap with shared foundation: ${overlapping.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get visual debugging info for track branching
 */
export function getTrackBranchingDebugInfo() {
  const allNodes = new Set<string>();
  const convergencePoints = new Set<string>();
  const branchingPoints = new Set<string>();
  
  Object.values(TRACKS).forEach(track => {
    track.nodes.forEach(node => allNodes.add(node));
    if (track.convergencePoint) convergencePoints.add(track.convergencePoint);
    if (track.branchingPoint) branchingPoints.add(track.branchingPoint);
  });
  
  console.group('🌳 Track Branching Debug Info');
  console.log('📊 Total unique nodes:', allNodes.size);
  console.log('🔀 Branching points:', Array.from(branchingPoints));
  console.log('⭐ Convergence points:', Array.from(convergencePoints));
  
  Object.entries(TRACKS).forEach(([trackId, track]) => {
    console.group(`🎯 Track: ${trackId} (${track.name})`);
    console.log('Foundation:', track.sharedFoundation.join(' → '));
    console.log('Branching at:', track.branchingPoint);
    console.log('Unique path:', track.uniqueNodes.join(' → '));
    console.log('Converges at:', track.convergencePoint);
    console.groupEnd();
  });
  
  const validation = validateTrackDefinitions();
  if (!validation.isValid) {
    console.error('❌ Track validation errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Track validation warnings:', validation.warnings);
  }
  
  console.groupEnd();
  
  return {
    allNodes: Array.from(allNodes),
    convergencePoints: Array.from(convergencePoints),
    branchingPoints: Array.from(branchingPoints),
    validation
  };
}

/**
 * Log track highlighting state for debugging
 */
export function debugTrackHighlighting(
  primaryTrack: TrackId | null,
  comparisonTrack: TrackId | null,
  primaryNodes: Set<string> | null,
  comparisonNodes: Set<string> | null
) {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🎨 Track Highlighting Debug');
  console.log('Primary track:', primaryTrack, '| Nodes:', primaryNodes?.size || 0);
  console.log('Comparison track:', comparisonTrack, '| Nodes:', comparisonNodes?.size || 0);
  
  if (primaryNodes && comparisonNodes) {
    const shared = new Set([...primaryNodes].filter(n => comparisonNodes.has(n)));
    const primaryOnly = new Set([...primaryNodes].filter(n => !comparisonNodes.has(n)));
    const comparisonOnly = new Set([...comparisonNodes].filter(n => !primaryNodes.has(n)));
    
    console.log('Shared nodes:', shared.size, Array.from(shared));
    console.log('Primary only:', primaryOnly.size, Array.from(primaryOnly));
    console.log('Comparison only:', comparisonOnly.size, Array.from(comparisonOnly));
  }
  
  console.groupEnd();
}
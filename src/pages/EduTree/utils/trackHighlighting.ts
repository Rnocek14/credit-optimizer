/**
 * Track highlighting utilities for multipath visualization
 */
import { TrackId, TRACKS } from '../tracks';

/**
 * Get nodes for a specific track
 */
export function getTrackNodes(trackId: TrackId): Set<string> {
  return new Set(TRACKS[trackId]?.nodes || []);
}

/**
 * Get shared nodes between two tracks (proper branching logic)
 */
export function getSharedNodes(primaryTrack: TrackId, comparisonTrack: TrackId): Set<string> {
  const primaryNodes = getTrackNodes(primaryTrack);
  const comparisonNodes = getTrackNodes(comparisonTrack);
  
  // Include all shared foundation nodes and terminal convergence
  const sharedNodes = new Set([...primaryNodes].filter(nodeId => comparisonNodes.has(nodeId)));
  
  // Debug logging for shared node computation
  if (process.env.NODE_ENV === 'development') {
    console.log(`Shared nodes between ${primaryTrack} and ${comparisonTrack}:`, Array.from(sharedNodes));
  }
  
  return sharedNodes;
}

/**
 * Get unique nodes for a track (nodes not shared with comparison track)
 */
export function getUniqueNodes(trackId: TrackId, otherTrack: TrackId): Set<string> {
  const trackNodes = getTrackNodes(trackId);
  const otherNodes = getTrackNodes(otherTrack);
  
  return new Set([...trackNodes].filter(nodeId => !otherNodes.has(nodeId)));
}

/**
 * Determine highlight class for a node based on track membership
 * Enhanced to support single-track highlighting and proper branching visualization
 */
export function getNodeHighlightClass(
  nodeId: string,
  primaryTrack: TrackId | null,
  comparisonTrack: TrackId | null,
  isMultipathActive: boolean
): string {
  // Allow single track highlighting
  if (!isMultipathActive || !primaryTrack) {
    return '';
  }

  const primaryNodes = getTrackNodes(primaryTrack);
  const inPrimary = primaryNodes.has(nodeId);
  
  // Single track mode - just highlight primary track
  if (!comparisonTrack) {
    return inPrimary ? 'node--primary' : 'node--dim';
  }
  
  // Dual track comparison mode
  const comparisonNodes = getTrackNodes(comparisonTrack);
  const inComparison = comparisonNodes.has(nodeId);
  
  if (inPrimary && inComparison) return 'node--both';
  if (inPrimary) return 'node--primary';
  if (inComparison) return 'node--comparison';
  return 'node--dim';
}

/**
 * Determine highlight class for terminal nodes
 * Enhanced to support single-track highlighting and proper convergence visualization
 */
export function getTerminalHighlightClass(
  nodeId: string,
  primaryTrack: TrackId | null,
  comparisonTrack: TrackId | null,
  isMultipathActive: boolean
): string {
  // Allow single track highlighting
  if (!isMultipathActive || !primaryTrack) {
    return '';
  }

  const primaryNodes = getTrackNodes(primaryTrack);
  const inPrimary = primaryNodes.has(nodeId);
  
  // Single track mode - just highlight primary track
  if (!comparisonTrack) {
    return inPrimary ? 'terminal--primary' : 'terminal--dim';
  }
  
  // Dual track comparison mode - terminal usually converges for all tracks
  const comparisonNodes = getTrackNodes(comparisonTrack);
  const inComparison = comparisonNodes.has(nodeId);
  
  if (inPrimary && inComparison) return 'terminal--both';
  if (inPrimary) return 'terminal--primary';
  if (inComparison) return 'terminal--comparison';
  return 'terminal--dim';
}

/**
 * Get branching point information for tracks
 */
export function getBranchingInfo(primaryTrack: TrackId, comparisonTrack: TrackId) {
  const primary = TRACKS[primaryTrack];
  const comparison = TRACKS[comparisonTrack];
  
  if (!primary || !comparison) return null;
  
  return {
    primaryBranchingPoint: primary.branchingPoint,
    comparisonBranchingPoint: comparison.branchingPoint,
    sharedFoundation: getSharedNodes(primaryTrack, comparisonTrack),
  };
}
/**
 * Track highlighting utilities for proper branching multipath visualization
 */
import { TrackId, TRACKS } from '../tracks';

/**
 * Get all nodes for a specific track
 */
export function getTrackNodes(trackId: TrackId): Set<string> {
  return new Set(TRACKS[trackId]?.nodes || []);
}

/**
 * Get shared foundation nodes (before branching point)
 */
export function getSharedFoundationNodes(primaryTrack: TrackId, comparisonTrack: TrackId): Set<string> {
  const primary = TRACKS[primaryTrack];
  const comparison = TRACKS[comparisonTrack];
  
  if (!primary || !comparison) return new Set();
  
  // Get nodes that appear in both foundation paths AND convergence
  const primaryFoundation = new Set(primary.sharedFoundation);
  const comparisonFoundation = new Set(comparison.sharedFoundation);
  const convergence = new Set([primary.convergencePoint, comparison.convergencePoint]);
  
  // Intersection of foundations + convergence point
  const shared = new Set([...primaryFoundation].filter(nodeId => comparisonFoundation.has(nodeId)));
  convergence.forEach(nodeId => shared.add(nodeId));
  
  // Enhanced debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌳 Shared foundation between ${primaryTrack} and ${comparisonTrack}:`, {
      shared: Array.from(shared),
      primaryFoundation: Array.from(primaryFoundation),
      comparisonFoundation: Array.from(comparisonFoundation),
      convergence: Array.from(convergence)
    });
  }
  
  return shared;
}

/**
 * Get shared nodes between two tracks (proper branching logic)
 */
export function getSharedNodes(primaryTrack: TrackId, comparisonTrack: TrackId): Set<string> {
  return getSharedFoundationNodes(primaryTrack, comparisonTrack);
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
 * Get unique specialization nodes for a track (after branching point)
 */
export function getUniqueSpecializationNodes(trackId: TrackId): Set<string> {
  return new Set(TRACKS[trackId]?.uniqueNodes || []);
}

/**
 * Check if node is a branching point
 */
export function isBranchingPoint(nodeId: string, trackId: TrackId): boolean {
  return TRACKS[trackId]?.branchingPoint === nodeId;
}

/**
 * Check if node is convergence point
 */
export function isConvergencePoint(nodeId: string): boolean {
  return Object.values(TRACKS).some(track => track.convergencePoint === nodeId);
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
  // Only apply highlighting when multipath is active
  if (!isMultipathActive || !primaryTrack) {
    return '';
  }

  const primaryNodes = getTrackNodes(primaryTrack);
  const inPrimary = primaryNodes.has(nodeId);
  
  // Single track mode - highlight primary track nodes, dim others
  if (!comparisonTrack) {
    return inPrimary ? 'node--primary' : 'node--dim';
  }
  
  // Dual track comparison mode - enhanced branching logic
  const comparisonNodes = getTrackNodes(comparisonTrack);
  const inComparison = comparisonNodes.has(nodeId);
  
  // Special handling for shared foundation and convergence
  const isShared = getSharedFoundationNodes(primaryTrack, comparisonTrack).has(nodeId);
  const isConvergence = isConvergencePoint(nodeId);
  const isBranching = isBranchingPoint(nodeId, primaryTrack) || isBranchingPoint(nodeId, comparisonTrack);
  
  if (isShared || isConvergence) return 'node--both';
  if (isBranching) return 'node--both'; // branching points are shared
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
 * Get comprehensive branching information for tracks
 */
export function getBranchingInfo(primaryTrack: TrackId, comparisonTrack: TrackId) {
  const primary = TRACKS[primaryTrack];
  const comparison = TRACKS[comparisonTrack];
  
  if (!primary || !comparison) return null;
  
  return {
    primaryBranchingPoint: primary.branchingPoint,
    comparisonBranchingPoint: comparison.branchingPoint,
    sharedFoundation: getSharedFoundationNodes(primaryTrack, comparisonTrack),
    primarySpecialization: primary.specialization,
    comparisonSpecialization: comparison.specialization,
    convergencePoint: primary.convergencePoint, // should be same for all tracks
  };
}

/**
 * Generate debug information for track highlighting
 */
export function getTrackDebugInfo(primaryTrack: TrackId | null, comparisonTrack: TrackId | null) {
  if (!primaryTrack) return null;
  
  const info = {
    primaryTrack,
    comparisonTrack,
    primaryNodes: Array.from(getTrackNodes(primaryTrack)),
    comparisonNodes: comparisonTrack ? Array.from(getTrackNodes(comparisonTrack)) : [],
    sharedNodes: comparisonTrack ? Array.from(getSharedFoundationNodes(primaryTrack, comparisonTrack)) : [],
    branchingInfo: comparisonTrack ? getBranchingInfo(primaryTrack, comparisonTrack) : null,
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Track Debug Info:', info);
  }
  
  return info;
}
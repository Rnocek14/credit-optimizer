/**
 * Track highlighting utilities for proper branching multipath visualization
 * Integrates with the new branching data structure
 */
import { TrackId, TRACKS } from '../tracks';
import { 
  getTrackNodesFromStructure, 
  getTrackEdgesFromStructure,
  getSharedNodesFromStructure,
  getUniqueNodesFromStructure,
  isBranchingPointFromStructure,
  isConvergencePointFromStructure,
  BRANCHING_STRUCTURE
} from '../core/branchingData';

/**
 * Get all nodes for a specific track (enhanced with branching structure)
 */
export function getTrackNodes(trackId: TrackId): Set<string> {
  // Use the new branching structure first, fallback to legacy TRACKS
  try {
    return getTrackNodesFromStructure(trackId);
  } catch {
    return new Set(TRACKS[trackId]?.nodes || []);
  }
}

/**
 * Get all edges for a specific track
 */
export function getTrackEdges(trackId: TrackId): Set<string> {
  try {
    return getTrackEdgesFromStructure(trackId);
  } catch {
    // Fallback: construct edge IDs from TRACKS data
    const nodes = TRACKS[trackId]?.nodes || [];
    const edges = new Set<string>();
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.add(`${nodes[i]}->${nodes[i + 1]}`);
    }
    return edges;
  }
}

/**
 * Get shared foundation nodes (before branching point)
 */
export function getSharedFoundationNodes(primaryTrack: TrackId, comparisonTrack: TrackId): Set<string> {
  try {
    return getSharedNodesFromStructure(primaryTrack, comparisonTrack);
  } catch {
    // Fallback to legacy intersection logic
    const primary = TRACKS[primaryTrack];
    const comparison = TRACKS[comparisonTrack];
    
    if (!primary || !comparison) return new Set();

    const primaryNodes = new Set(primary.nodes);
    const comparisonNodes = new Set(comparison.nodes);
    const shared = new Set<string>();

    for (const node of primaryNodes) {
      if (comparisonNodes.has(node)) {
        shared.add(node);
      }
    }

    return shared;
  }
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
  try {
    return getUniqueNodesFromStructure(trackId, otherTrack);
  } catch {
    const trackNodes = getTrackNodes(trackId);
    const otherNodes = getTrackNodes(otherTrack);
    
    return new Set([...trackNodes].filter(nodeId => !otherNodes.has(nodeId)));
  }
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
  try {
    return isBranchingPointFromStructure(nodeId);
  } catch {
    return TRACKS[trackId]?.branchingPoint === nodeId;
  }
}

/**
 * Check if node is convergence point
 */
export function isConvergencePoint(nodeId: string): boolean {
  try {
    return isConvergencePointFromStructure(nodeId);
  } catch {
    return Object.values(TRACKS).some(track => track.convergencePoint === nodeId);
  }
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
  
  // Enhanced branching logic with visual hierarchy
  const isShared = getSharedFoundationNodes(primaryTrack, comparisonTrack).has(nodeId);
  const isConvergence = isConvergencePoint(nodeId);
  const isBranching = isBranchingPoint(nodeId, primaryTrack) || isBranchingPoint(nodeId, comparisonTrack);
  
  // Prioritize convergence and branching points
  if (isConvergence) return 'node--both node--convergence';
  if (isBranching) return 'node--both node--branching';
  if (isShared) return 'node--both';
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
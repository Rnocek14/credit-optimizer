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
 * Get shared nodes between two tracks
 */
export function getSharedNodes(primaryTrack: TrackId, comparisonTrack: TrackId): Set<string> {
  const primaryNodes = getTrackNodes(primaryTrack);
  const comparisonNodes = getTrackNodes(comparisonTrack);
  
  return new Set([...primaryNodes].filter(nodeId => comparisonNodes.has(nodeId)));
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
 */
export function getNodeHighlightClass(
  nodeId: string,
  primaryTrack: TrackId | null,
  comparisonTrack: TrackId | null,
  isMultipathActive: boolean
): string {
  if (!isMultipathActive || !primaryTrack || !comparisonTrack) {
    return '';
  }

  const primaryNodes = getTrackNodes(primaryTrack);
  const comparisonNodes = getTrackNodes(comparisonTrack);
  
  const inPrimary = primaryNodes.has(nodeId);
  const inComparison = comparisonNodes.has(nodeId);
  
  if (inPrimary && inComparison) return 'node--both';
  if (inPrimary) return 'node--primary';
  if (inComparison) return 'node--comparison';
  return 'node--dim';
}

/**
 * Determine highlight class for terminal nodes
 */
export function getTerminalHighlightClass(
  nodeId: string,
  primaryTrack: TrackId | null,
  comparisonTrack: TrackId | null,
  isMultipathActive: boolean
): string {
  if (!isMultipathActive || !primaryTrack || !comparisonTrack) {
    return '';
  }

  const primaryNodes = getTrackNodes(primaryTrack);
  const comparisonNodes = getTrackNodes(comparisonTrack);
  
  const inPrimary = primaryNodes.has(nodeId);
  const inComparison = comparisonNodes.has(nodeId);
  
  if (inPrimary && inComparison) return 'terminal--both';
  if (inPrimary) return 'terminal--primary';
  if (inComparison) return 'terminal--comparison';
  return 'terminal--dim';
}
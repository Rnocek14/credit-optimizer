// Debug utilities for track comparison system
import type { TrackHighlights } from '../hooks/useTrackComparison';

export interface HighlightDebugInfo {
  primaryTrack: string | null;
  comparisonTrack: string | null;
  primaryNodes: number;
  comparisonNodes: number;
  sharedNodes: number;
  dimmedNodes: number;
  primaryEdges: number;
  comparisonEdges: number;
  sharedEdges: number;
  dimmedEdges: number;
  totalNodes: number;
  totalEdges: number;
  classificationSummary: {
    primary: string[];
    comparison: string[];
    shared: string[];
    dimmed: string[];
  };
}

export function generateDebugInfo(
  highlights: TrackHighlights,
  primaryTrackId?: string,
  comparisonTrackId?: string,
  totalNodeCount = 0,
  totalEdgeCount = 0
): HighlightDebugInfo {
  
  const primaryNodes = Array.from(highlights.primaryNodes);
  const comparisonNodes = Array.from(highlights.comparisonNodes);
  const sharedNodes = Array.from(highlights.sharedNodes);
  
  const primaryEdges = Array.from(highlights.primaryEdges);
  const comparisonEdges = Array.from(highlights.comparisonEdges);
  const sharedEdges = Array.from(highlights.sharedEdges);
  
  // Calculate dimmed counts (everything not highlighted)
  const highlightedNodeCount = primaryNodes.length + comparisonNodes.length + sharedNodes.length;
  const highlightedEdgeCount = primaryEdges.length + comparisonEdges.length + sharedEdges.length;
  
  return {
    primaryTrack: primaryTrackId || null,
    comparisonTrack: comparisonTrackId || null,
    primaryNodes: primaryNodes.length,
    comparisonNodes: comparisonNodes.length,
    sharedNodes: sharedNodes.length,
    dimmedNodes: Math.max(0, totalNodeCount - highlightedNodeCount),
    primaryEdges: primaryEdges.length,
    comparisonEdges: comparisonEdges.length,
    sharedEdges: sharedEdges.length,
    dimmedEdges: Math.max(0, totalEdgeCount - highlightedEdgeCount),
    totalNodes: totalNodeCount,
    totalEdges: totalEdgeCount,
    classificationSummary: {
      primary: primaryNodes.slice(0, 5).map(id => `${id.substring(0, 12)}...`),
      comparison: comparisonNodes.slice(0, 5).map(id => `${id.substring(0, 12)}...`),
      shared: sharedNodes.slice(0, 5).map(id => `${id.substring(0, 12)}...`),
      dimmed: [`${Math.max(0, totalNodeCount - highlightedNodeCount)} nodes dimmed`]
    }
  };
}

export function logHighlightDebugInfo(debugInfo: HighlightDebugInfo) {
  const style = {
    primary: 'color: #047857; font-weight: bold;',
    comparison: 'color: #ea580c; font-weight: bold;',
    shared: 'color: #7c3aed; font-weight: bold;',
    dimmed: 'color: #6b7280; font-style: italic;',
    header: 'color: #1f2937; font-weight: bold; font-size: 14px;'
  };

  console.group('🎯 Track Comparison Debug Info');
  
  console.log(
    `%cComparing: %c${debugInfo.primaryTrack || 'None'} %cvs %c${debugInfo.comparisonTrack || 'None'}`,
    style.header, style.primary, style.header, style.comparison
  );
  
  console.group('📊 Node Classification');
  console.log(`%cPrimary: ${debugInfo.primaryNodes} nodes`, style.primary);
  console.log(`%cComparison: ${debugInfo.comparisonNodes} nodes`, style.comparison);
  console.log(`%cShared: ${debugInfo.sharedNodes} nodes`, style.shared);
  console.log(`%cDimmed: ${debugInfo.dimmedNodes} nodes`, style.dimmed);
  console.log(`Total: ${debugInfo.totalNodes} nodes`);
  console.groupEnd();
  
  console.group('🔗 Edge Classification');
  console.log(`%cPrimary: ${debugInfo.primaryEdges} edges`, style.primary);
  console.log(`%cComparison: ${debugInfo.comparisonEdges} edges`, style.comparison);
  console.log(`%cShared: ${debugInfo.sharedEdges} edges`, style.shared);
  console.log(`%cDimmed: ${debugInfo.dimmedEdges} edges`, style.dimmed);
  console.log(`Total: ${debugInfo.totalEdges} edges`);
  console.groupEnd();
  
  console.group('🔍 Sample Node IDs');
  if (debugInfo.classificationSummary.primary.length > 0) {
    console.log(`%cPrimary nodes: ${debugInfo.classificationSummary.primary.join(', ')}`, style.primary);
  }
  if (debugInfo.classificationSummary.comparison.length > 0) {
    console.log(`%cComparison nodes: ${debugInfo.classificationSummary.comparison.join(', ')}`, style.comparison);
  }
  if (debugInfo.classificationSummary.shared.length > 0) {
    console.log(`%cShared nodes: ${debugInfo.classificationSummary.shared.join(', ')}`, style.shared);
  }
  console.groupEnd();
  
  console.groupEnd();
}
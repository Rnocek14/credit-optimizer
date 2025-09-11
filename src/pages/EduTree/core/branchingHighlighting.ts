/**
 * Advanced highlighting system for branching tree visualization
 * Provides precise track-aware highlighting with proper visual hierarchy
 */

import { 
  BRANCHING_STRUCTURE, 
  getTrackNodesFromStructure, 
  getTrackEdgesFromStructure,
  getSharedNodesFromStructure,
  getUniqueNodesFromStructure,
  isBranchingPointFromStructure,
  isConvergencePointFromStructure
} from './branchingData';

export interface HighlightResult {
  nodes: Set<string>;
  edges: Set<string>;
}

export interface BranchingHighlightState {
  primaryTrack: string | null;
  comparisonTrack: string | null;
  highlightedPrimary: HighlightResult | null;
  highlightedComparison: HighlightResult | null;
  isMultipathActive: boolean;
}

/**
 * Calculate highlighting for a single track
 */
export function calculateSingleTrackHighlight(trackId: string): HighlightResult {
  return {
    nodes: getTrackNodesFromStructure(trackId),
    edges: getTrackEdgesFromStructure(trackId)
  };
}

/**
 * Calculate highlighting for dual track comparison
 */
export function calculateDualTrackHighlight(
  primaryTrack: string, 
  comparisonTrack: string
): {
  primary: HighlightResult;
  comparison: HighlightResult;
  shared: HighlightResult;
  uniquePrimary: HighlightResult;
  uniqueComparison: HighlightResult;
} {
  const primaryNodes = getTrackNodesFromStructure(primaryTrack);
  const primaryEdges = getTrackEdgesFromStructure(primaryTrack);
  
  const comparisonNodes = getTrackNodesFromStructure(comparisonTrack);
  const comparisonEdges = getTrackEdgesFromStructure(comparisonTrack);

  const sharedNodes = getSharedNodesFromStructure(primaryTrack, comparisonTrack);
  const sharedEdges = new Set(
    BRANCHING_STRUCTURE.edges
      .filter(edge => 
        edge.tracks.includes(primaryTrack) && 
        edge.tracks.includes(comparisonTrack)
      )
      .map(edge => edge.id)
  );

  const uniquePrimaryNodes = getUniqueNodesFromStructure(primaryTrack, comparisonTrack);
  const uniquePrimaryEdges = new Set(
    BRANCHING_STRUCTURE.edges
      .filter(edge => 
        edge.tracks.includes(primaryTrack) && 
        !edge.tracks.includes(comparisonTrack)
      )
      .map(edge => edge.id)
  );

  const uniqueComparisonNodes = getUniqueNodesFromStructure(comparisonTrack, primaryTrack);
  const uniqueComparisonEdges = new Set(
    BRANCHING_STRUCTURE.edges
      .filter(edge => 
        edge.tracks.includes(comparisonTrack) && 
        !edge.tracks.includes(primaryTrack)
      )
      .map(edge => edge.id)
  );

  return {
    primary: { nodes: primaryNodes, edges: primaryEdges },
    comparison: { nodes: comparisonNodes, edges: comparisonEdges },
    shared: { nodes: sharedNodes, edges: sharedEdges },
    uniquePrimary: { nodes: uniquePrimaryNodes, edges: uniquePrimaryEdges },
    uniqueComparison: { nodes: uniqueComparisonNodes, edges: uniqueComparisonEdges }
  };
}

/**
 * Get the appropriate CSS class for a node based on highlighting state
 */
export function getNodeHighlightClass(
  nodeId: string,
  state: BranchingHighlightState
): string {
  const classes: string[] = ['node'];

  if (!state.isMultipathActive) {
    return classes.join(' ');
  }

  const isPrimary = state.highlightedPrimary?.nodes.has(nodeId) || false;
  const isComparison = state.highlightedComparison?.nodes.has(nodeId) || false;

  if (state.comparisonTrack) {
    // Dual track comparison mode
    if (isPrimary && isComparison) {
      classes.push('node--both');
    } else if (isPrimary) {
      classes.push('node--primary');
    } else if (isComparison) {
      classes.push('node--comparison');
    } else {
      classes.push('node--dim');
    }
  } else if (state.primaryTrack) {
    // Single track mode
    if (isPrimary) {
      classes.push('node--primary');
    } else {
      classes.push('node--dim');
    }
  }

  // Add special markers for key nodes
  if (isBranchingPointFromStructure(nodeId)) {
    classes.push('node--branching');
  }

  if (isConvergencePointFromStructure(nodeId)) {
    classes.push('node--convergence');
  }

  return classes.join(' ');
}

/**
 * Get the appropriate CSS class for terminal nodes
 */
export function getTerminalHighlightClass(
  nodeId: string,
  state: BranchingHighlightState
): string {
  const classes: string[] = ['terminal'];

  if (!state.isMultipathActive) {
    return classes.join(' ');
  }

  const isPrimary = state.highlightedPrimary?.nodes.has(nodeId) || false;
  const isComparison = state.highlightedComparison?.nodes.has(nodeId) || false;

  if (state.comparisonTrack) {
    // Dual track comparison mode
    if (isPrimary && isComparison) {
      classes.push('terminal--both');
    } else if (isPrimary) {
      classes.push('terminal--primary');
    } else if (isComparison) {
      classes.push('terminal--comparison');
    } else {
      classes.push('terminal--dim');
    }
  } else if (state.primaryTrack) {
    // Single track mode
    if (isPrimary) {
      classes.push('terminal--primary');
    } else {
      classes.push('terminal--dim');
    }
  }

  // Add convergence marker
  if (isConvergencePointFromStructure(nodeId)) {
    classes.push('terminal--convergence');
  }

  return classes.join(' ');
}

/**
 * Get the appropriate CSS class for edges based on highlighting state
 */
export function getEdgeHighlightClass(
  edgeId: string,
  state: BranchingHighlightState
): string {
  const classes: string[] = ['edge'];

  if (!state.isMultipathActive) {
    return classes.join(' ');
  }

  const isPrimary = state.highlightedPrimary?.edges.has(edgeId) || false;
  const isComparison = state.highlightedComparison?.edges.has(edgeId) || false;

  if (state.comparisonTrack) {
    // Dual track comparison mode
    if (isPrimary && isComparison) {
      classes.push('edge--both');
    } else if (isPrimary) {
      classes.push('edge--primary');
    } else if (isComparison) {
      classes.push('edge--comparison');
    } else {
      classes.push('edge--dim');
    }
  } else if (state.primaryTrack) {
    // Single track mode
    if (isPrimary) {
      classes.push('edge--primary');
    } else {
      classes.push('edge--dim');
    }
  }

  return classes.join(' ');
}

/**
 * Create a branching highlight state from track selections
 */
export function createBranchingHighlightState(
  primaryTrack: string | null,
  comparisonTrack: string | null
): BranchingHighlightState {
  const isMultipathActive = !!primaryTrack;
  
  let highlightedPrimary: HighlightResult | null = null;
  let highlightedComparison: HighlightResult | null = null;

  if (primaryTrack) {
    highlightedPrimary = calculateSingleTrackHighlight(primaryTrack);
  }

  if (comparisonTrack) {
    highlightedComparison = calculateSingleTrackHighlight(comparisonTrack);
  }

  return {
    primaryTrack,
    comparisonTrack,
    highlightedPrimary,
    highlightedComparison,
    isMultipathActive
  };
}

/**
 * Get detailed branching analysis for debugging
 */
export function getBranchingAnalysis(
  primaryTrack: string,
  comparisonTrack?: string
): {
  foundation: string[];
  branchingPoint: string;
  convergencePoint: string;
  primarySpecialization: string[];
  comparisonSpecialization?: string[];
  sharedPath: string[];
  uniquePrimary: string[];
  uniqueComparison?: string[];
} {
  const analysis = {
    foundation: BRANCHING_STRUCTURE.foundationNodes,
    branchingPoint: BRANCHING_STRUCTURE.branchingPoint,
    convergencePoint: BRANCHING_STRUCTURE.convergencePoint,
    primarySpecialization: BRANCHING_STRUCTURE.trackSpecializations[primaryTrack] || [],
    sharedPath: Array.from(getSharedNodesFromStructure(primaryTrack, comparisonTrack || primaryTrack)),
    uniquePrimary: Array.from(getUniqueNodesFromStructure(primaryTrack, comparisonTrack || ''))
  };

  if (comparisonTrack) {
    return {
      ...analysis,
      comparisonSpecialization: BRANCHING_STRUCTURE.trackSpecializations[comparisonTrack] || [],
      uniqueComparison: Array.from(getUniqueNodesFromStructure(comparisonTrack, primaryTrack))
    };
  }

  return analysis;
}
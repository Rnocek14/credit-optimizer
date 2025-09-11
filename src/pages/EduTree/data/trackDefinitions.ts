export interface TrackDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  blockIds: string[];
}

export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    description: 'Focus on software development, algorithms, and system design',
    color: '#007bff',
    blockIds: ['1', '2', '3', '4', '5', '6', '9']
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Focus on data analysis, machine learning, and statistics',
    color: '#ff9300',
    blockIds: ['1', '2', '3', '4', '7', '8', '9']
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Focus on security, cryptography, and risk management',
    color: '#dc3545',
    blockIds: ['1', '2', '3', '4', '10', '11', '9']
  }
];

export function getTrackById(id: string): TrackDefinition | undefined {
  return TRACK_DEFINITIONS.find(track => track.id === id);
}

// Guard edge-IDs at source - enforce block-based IDs
export const eid = (s: string, t: string) => `e-${String(s)}-${String(t)}`;

export function generateEdgeIds(blockSequence: string[]): string[] {
  return blockSequence.slice(0, -1).map((src, i) => eid(src, blockSequence[i + 1]));
}

export interface TrackHighlights {
  nodes: Set<string>;
  edges: Set<string>;
}

export function computeTrackHighlights(
  primaryTrack?: TrackDefinition,
  comparisonTrack?: TrackDefinition
): {
  primaryHighlights: TrackHighlights;
  comparisonHighlights: TrackHighlights;
  bothNodes: Set<string>;
  bothEdges: Set<string>;
  primaryOnlyNodes: Set<string>;
  comparisonOnlyNodes: Set<string>;
  primaryOnlyEdges: Set<string>;
  comparisonOnlyEdges: Set<string>;
} {
  const primaryNodes = new Set(primaryTrack?.blockIds || []);
  const comparisonNodes = new Set(comparisonTrack?.blockIds || []);
  
  const primaryEdges = new Set(primaryTrack ? generateEdgeIds(primaryTrack.blockIds) : []);
  const comparisonEdges = new Set(comparisonTrack ? generateEdgeIds(comparisonTrack.blockIds) : []);

  // Compute intersections
  const bothNodes = new Set([...primaryNodes].filter(id => comparisonNodes.has(id)));
  const bothEdges = new Set([...primaryEdges].filter(id => comparisonEdges.has(id)));

  // Compute exclusive sets
  const primaryOnlyNodes = new Set([...primaryNodes].filter(id => !bothNodes.has(id)));
  const comparisonOnlyNodes = new Set([...comparisonNodes].filter(id => !bothNodes.has(id)));
  const primaryOnlyEdges = new Set([...primaryEdges].filter(id => !bothEdges.has(id)));
  const comparisonOnlyEdges = new Set([...comparisonEdges].filter(id => !bothEdges.has(id)));

  return {
    primaryHighlights: { nodes: primaryNodes, edges: primaryEdges },
    comparisonHighlights: { nodes: comparisonNodes, edges: comparisonEdges },
    bothNodes,
    bothEdges,
    primaryOnlyNodes,
    comparisonOnlyNodes,
    primaryOnlyEdges,
    comparisonOnlyEdges
  };
}
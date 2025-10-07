export type NodeType = 'year' | 'track-bundle' | 'requirement' | 'gate';

export type TrackId = 'se' | 'ds' | 'any' | undefined;

export interface Position { 
  x: number; 
  y: number; 
}

export interface V3NodeData {
  year?: 1 | 2 | 3 | 4;
  programId?: string;
  trackId?: TrackId;
  title?: string;
  anchorX?: number; // For gates: locked X position to prevent drift
}

export interface V3Node {
  id: string;              // no fallbacks, stable
  type: NodeType;
  data: V3NodeData;
  position: Position;      // set by layout engine
}

export interface V3Edge {
  id: string;
  source: string;
  target: string;
  kind: 'prereq' | 'gate' | 'advisory' | 'coreq';
}

export interface V3Graph {
  nodes: V3Node[];
  edges: V3Edge[];
}

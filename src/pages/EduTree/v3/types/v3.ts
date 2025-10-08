export type NodeType = 'year' | 'track-bundle' | 'requirement' | 'gate';

export type TrackId = 'se' | 'ds' | 'any' | undefined;

export interface Position { 
  x: number; 
  y: number; 
}

export interface CompareInfo {
  courses: number;
  credits: number;
  list?: string[];
  outcomes?: string[];
  durationWeeks?: number;
}

export interface V3NodeData {
  year?: 1 | 2 | 3 | 4;
  programId?: string;
  trackId?: TrackId;
  title?: string;
  anchorX?: number; // For gates: locked X position to prevent drift
  junctionType?: 'program' | 'track';
  
  // Bundle-specific fields
  childCount?: number;
  totalCredits?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  
  // Requirement-specific fields  
  credits_needed?: number;
  
  // Comparison fields (for Track Gate)
  showCompare?: boolean;
  se?: CompareInfo;
  ds?: CompareInfo;
  
  // Single-track mode (for gates)
  singleTrackMode?: boolean;
  activeTrack?: 'se' | 'ds';
}

export interface V3Node {
  id: string;              // no fallbacks, stable
  type: NodeType;
  data: V3NodeData;
  position: Position;      // set by layout engine
  sourcePosition?: 'top' | 'bottom' | 'left' | 'right';  // edge connection point
  targetPosition?: 'top' | 'bottom' | 'left' | 'right';  // edge connection point
}

export interface V3Edge {
  id: string;
  source: string;
  target: string;
  kind: 'prereq' | 'gate' | 'advisory' | 'coreq' | 'spine';
}

export interface V3Graph {
  nodes: V3Node[];
  edges: V3Edge[];
}

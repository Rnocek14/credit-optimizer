// === Phase 1: Type System & Contracts ===

/**
 * Path taxonomy levels for hierarchical path identity
 * Maps to the Life Path Graph structure
 */
export type PathLevelType = 'degree_level' | 'degree_type' | 'major' | 'track' | 'emphasis';

/**
 * Canonical lineage for stable path identification
 * Used for deep links, analytics, merge detection
 * 
 * Example: BS → CS → SE = { 
 *   levels: [
 *     { type: 'degree_level', slug: 'bs', label: 'Bachelor of Science' },
 *     { type: 'major', slug: 'cs', label: 'Computer Science' },
 *     { type: 'track', slug: 'se', label: 'Software Engineering' }
 *   ],
 *   canonicalSlug: 'bs/cs/se'
 * }
 */
export interface PathLineage {
  levels: Array<{ type: PathLevelType; slug: string; label: string }>;
  canonicalSlug: string; // Stable ID for this path (never derived from labels)
}

/**
 * Branch selection state machine
 * Controls UI dimming and checkpoint drawer
 */
export type BranchState =
  | { kind: 'unselected' }                          // Default: all paths visible
  | { kind: 'preview'; checkpointId: string }       // Drawer open; dim non-siblings
  | { kind: 'selected'; pathSlug: string };         // User chose a branch; dim others

/**
 * Preview card for checkpoint alternatives
 * Used in drawer matrix and inline comparisons
 */
export interface CheckpointOptionPreview {
  pathSlug: string;        // Canonical slug for this alternative
  name: string;            // Display name
  courses: number;         // Course count
  credits: number;         // Credit hours
  costUsd?: number;        // Optional cost estimate
  durationWeeks?: number;  // Optional duration estimate
  badges?: string[];       // Optional badges (ACE, CLEP, etc.)
  score?: number;          // Ranking score (for deterministic top-2)
}

export type NodeType = 'year' | 'track-bundle' | 'requirement' | 'gate' | 'checkpoint';

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
  // === Legacy fields (DEPRECATED in Phase 3: Flexible Tiers) ===
  /** @deprecated Use `tier` instead (will be removed in Phase 4) */
  year?: 1 | 2 | 3 | 4;
  
  // === Phase 1: Flexible hierarchy support ===
  tier?: number;         // NEW: flexible tier (0-based, replaces year)
  tierLabel?: string;    // NEW: display label (e.g., "Year 1" or "Associate Entry")
  type?: 'bundle' | 'gate' | 'checkpoint'; // NEW: node semantic type
  
  // === Phase 1: Multipath support ===
  lineage?: PathLineage;                        // NEW: canonical path identity
  showAlternatives?: boolean;                   // NEW: whether to show alternative branches
  alternatives?: CheckpointOptionPreview[];     // NEW: available path options at this checkpoint
  
  // === Existing fields ===
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
  kind: 'prereq' | 'gate' | 'advisory' | 'coreq' | 'spine' | 'alternative'; // Phase 1: added 'alternative'
  data?: {
    merge?: boolean;        // Phase 1: marks converging paths (≥2 incoming from siblings)
    transferRate?: number;  // Phase 1: optional credit transfer percentage
  };
}

export interface V3Graph {
  nodes: V3Node[];
  edges: V3Edge[];
}

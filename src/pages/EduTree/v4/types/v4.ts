/**
 * V4 Schema - TypeScript interfaces for spine-first planner
 * Based on V4 Research Submission #3
 */

export type NodeID = string;
export type EdgeID = string;

export enum NodeType {
  Year = "year",
  Course = "course",
  Requirement = "requirement",
  External = "external",
  Bundle = "bundle"
}

export enum EdgeType {
  Prerequisite = "prerequisite",
  Corequisite = "corequisite",
  Equivalency = "equivalent",
  Fulfills = "fulfills",
  Sequence = "sequence"
}

export interface PlanNodeData {
  label: string;
  credits?: number;
  status?: "completed" | "in-progress" | "planned" | "unplanned";
  source?: "institution" | "transfer" | "exam" | "other";
  
  // Overlay flags
  transferable?: boolean;      // Has known transfer equivalent
  residencyRequired?: boolean; // Must be taken in residence
  critical?: boolean;          // Critical course/marker
  alternativeFor?: string;     // For ghost nodes: which course this replaces
  
  // Metadata
  year?: number;
  term?: string;
  expiresOn?: string;         // For expired credits
  
  // Provider matching fields
  skillTags?: string[];        // Skills required for matching providers
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;     // Typical completion time
  
  // Selected provider (when user chooses alternate)
  selectedProviderId?: string;
  selectedTeacherId?: string;
  
  // Event handlers (injected at layout time)
  onClick?: () => void;
}

export interface PlanNode {
  id: NodeID;
  type: NodeType;
  data: PlanNodeData;
  position: { x: number; y: number };
  className?: string;  // e.g., "spine-node is-transferable"
}

export interface PlanEdge {
  id: EdgeID;
  source: NodeID;
  target: NodeID;
  type: EdgeType;
  label?: string;
  className?: string;  // e.g., "equiv-edge hidden"
  animated?: boolean;  // Emphasize critical paths
  hidden?: boolean;    // For toggle-based visibility
}

export interface V4GraphData {
  nodes: PlanNode[];
  edges: PlanEdge[];
}

export interface OverlayState {
  transfer: boolean;
  compare: boolean;
  optimize: boolean;
}

export interface V4DebugState {
  visibleNodes: NodeID[];
  activeOverlay: keyof OverlayState | null;
  layoutHash: string;
  lastFitView?: number;
  memoryUsage?: number;
}

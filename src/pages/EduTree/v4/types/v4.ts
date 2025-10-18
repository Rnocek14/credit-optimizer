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
  Bundle = "bundle",
  Placeholder = "placeholder"
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
  
  // Node type for data-type attribute
  type?: string;
  
  // Placeholder-specific fields
  area?: string;           // "Any discipline", "Humanities", etc.
  description?: string;    // "Pick any approved 300+ level course"
  
  // Overlay flags
  transferable?: boolean;      // Has known transfer equivalent
  residencyRequired?: boolean; // Must be taken in residence
  critical?: boolean;          // Critical course/marker
  alternativeFor?: string;     // For ghost nodes: which course this replaces
  
  // Metadata
  year?: number;
  semester?: 'fall' | 'spring'; // Semester assignment for 2-column layout
  tier?: number;               // Tier/depth for tier-based layout (future use)
  term?: string;
  expiresOn?: string;         // For expired credits
  
  // Course categorization for degree validation
  category?: 'coreCS' | 'math' | 'genEd' | 'elective' | 'capstone' | 'transfer';
  fulfills?: string[];        // Array of requirement IDs this course satisfies
  
  // Module grouping (Phase 2D)
  moduleId?: string;          // Links course to a sub-requirement module
  
  // Provider matching fields
  skillTags?: string[];        // Skills required for matching providers
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;     // Typical completion time
  
  // Selected provider (when user chooses alternate)
  selectedProviderId?: string;
  selectedTeacherId?: string;
  providerId?: string;         // Provider ID for marketplace courses
  
  // Policy status for visual badges
  policyStatus?: {
    transferable: boolean;
    accredited: boolean;
    articulated: boolean;
    articulationId?: string;
  };
  
  // Year node summary data (for SpineNode)
  creditsSummary?: {
    planned: number;
    required: number;
    byCategory: Record<string, number>;
  };
  loadHealth?: 'underloaded' | 'balanced' | 'overloaded';
  missingRequirements?: string[];
  
  // Event handlers (injected at layout time)
  onClick?: () => void;
}

export interface PlanNode {
  id: NodeID;
  type: NodeType;
  data: PlanNodeData;
  position: { x: number; y: number };
  className?: string;  // e.g., "spine-node is-transferable"
  parentNode?: string; // For nested modules: ID of parent node
  extent?: 'parent';   // Constrain child nodes to parent bounds
  style?: {           // ReactFlow style properties
    width?: number;
    height?: number;
    minHeight?: number;
  };
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

export type SubRequirementType = 'all-required' | 'select-n' | 'select-any';

export interface SubRequirement {
  id: string;
  label: string;
  category: string;
  type: SubRequirementType;
  requiredCount?: number; // For 'select-n': how many courses needed
  minCredits?: number;    // For 'select-any': minimum credits needed
  courseIds?: string[];   // For 'all-required' and 'select-n': specific courses
  tag?: string;           // For 'select-any': tag to match (e.g., 'elective', 'upper-div')
  
  // Phase 2D: Module UI metadata
  description?: string;   // Human-readable description
  icon?: string;         // Emoji or icon for display
}

export interface SubRequirementStatus {
  subReqId: string;
  label: string;
  completed: string[];    // Course IDs that satisfy this sub-requirement
  missing: string[];      // Course IDs still needed (for 'all-required' and 'select-n')
  creditsEarned: number;  // For 'select-any' type
  creditsNeeded: number;  // For 'select-any' type
  isComplete: boolean;
}

export interface DegreeRequirements {
  totalCredits: number;
  categories: {
    coreCS: { required: number; label: string };
    math: { required: number; label: string };
    genEd: { required: number; label: string };
    elective: { required: number; label: string };
    capstone: { required: number; label: string };
  };
  residencyMinimum?: number;
  subRequirements?: SubRequirement[]; // Optional granular requirements
}

export interface ValidationResult {
  totalCredits: { planned: number; required: number };
  byCategory: Map<string, { planned: number; required: number }>;
  missing: string[];
  warnings: string[];
  isValid: boolean;
  bySubRequirement?: SubRequirementStatus[]; // Optional granular status
}

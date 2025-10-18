/**
 * Hierarchical Requirements Schema - V2 Architecture
 * Supports two-level nesting: Bucket → Sequence → Courses
 */

export type RequirementLevel = 'program' | 'bucket' | 'sequence';
export type SubRequirementType = 'all-required' | 'select-n' | 'select-any';

export interface HierarchicalRequirement {
  id: string;
  label: string;
  category: string;
  icon?: string;
  description?: string;
  
  // Hierarchy support
  level: RequirementLevel;
  parentId?: string;
  children?: HierarchicalRequirement[];
  
  // Validation logic
  type: SubRequirementType;
  requiredCount?: number;    // For 'select-n': how many courses needed
  minCredits?: number;        // For 'select-any': minimum credits needed
  courseIds?: string[];       // For 'all-required' and 'select-n': specific courses
  tag?: string;               // For 'select-any': tag to match (e.g., 'elective', 'humanities')
  
  // Visual hints
  defaultCollapsed?: boolean;
  displayOrder?: number;
}

export interface DegreeRequirementsV2 {
  totalCredits: number;
  residencyMinimum?: number;
  
  // Tree structure
  requirements: HierarchicalRequirement[];
  
  // Legacy support (auto-generated from tree for backward compatibility)
  categories?: {
    coreCS: { required: number; label: string };
    math: { required: number; label: string };
    genEd: { required: number; label: string };
    elective: { required: number; label: string };
    capstone: { required: number; label: string };
  };
}

/**
 * Flatten hierarchical requirements into flat array (for backward compatibility)
 */
export function flattenRequirements(requirements: HierarchicalRequirement[]): HierarchicalRequirement[] {
  const flat: HierarchicalRequirement[] = [];
  
  function traverse(req: HierarchicalRequirement) {
    flat.push(req);
    if (req.children) {
      req.children.forEach(traverse);
    }
  }
  
  requirements.forEach(traverse);
  return flat;
}

/**
 * Find requirement by ID in hierarchy
 */
export function findRequirementById(
  id: string,
  requirements: HierarchicalRequirement[]
): HierarchicalRequirement | null {
  for (const req of requirements) {
    if (req.id === id) return req;
    if (req.children) {
      const found = findRequirementById(id, req.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get parent bucket for a sequence
 */
export function getParentBucket(
  sequenceId: string,
  requirements: HierarchicalRequirement[]
): HierarchicalRequirement | null {
  for (const bucket of requirements) {
    if (bucket.level === 'bucket' && bucket.children) {
      if (bucket.children.some(child => child.id === sequenceId)) {
        return bucket;
      }
    }
  }
  return null;
}

/**
 * Get all sequence-level requirements (leaf nodes that contain courses)
 */
export function getAllSequences(requirements: HierarchicalRequirement[]): HierarchicalRequirement[] {
  const sequences: HierarchicalRequirement[] = [];
  
  function traverse(req: HierarchicalRequirement) {
    if (req.level === 'sequence') {
      sequences.push(req);
    }
    if (req.children) {
      req.children.forEach(traverse);
    }
  }
  
  requirements.forEach(traverse);
  return sequences;
}

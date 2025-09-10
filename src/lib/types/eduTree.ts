export type RuleType = 'ALL' | 'K_OF_N' | 'CREDITS';

export interface EduCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  area: string;
  level_year: number;
  is_core: boolean;
  is_capstone: boolean;
  description?: string;
  learning_outcomes?: string[];
}

export interface RequirementBlock {
  id: string;
  title: string;
  rule_type: RuleType;
  k?: number | null;
  credits_needed?: number | null;
  level_year: number;
  area: string;
  parent_block_id?: string | null;
}

export interface BlockMember {
  id: string;
  block_id: string;
  course_id: string;
}

export interface BlockGate {
  id: string;
  block_id: string;
}

export interface GateEdge {
  id: string;
  source_gate_id: string;
  target_block_id: string;
}

// Computed types for UI
export interface BlockWithCourses extends RequirementBlock {
  courses: EduCourse[];
  gate?: BlockGate;
}

export interface BlockProgress {
  blockId: string;
  completed: number;
  required: number;
  isComplete: boolean;
  isUnlocked: boolean;
}

// New interfaces for enhanced features
export interface Skill {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export interface AltCreditOption {
  id: string;
  provider: string;
  provider_course_name: string;
  cost_estimate?: number;
  estimated_hours?: number;
  proctoring_required: boolean;
}

export interface EntryRole {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avg_salary_range?: string;
}

export interface PortfolioProject {
  id: string;
  name: string;
  description?: string;
  estimated_hours?: number;
  difficulty_level: number;
}

export type PlanningLens = 'fastest' | 'cheapest' | 'roi';

// Multipath comparison types
export interface PathScenario {
  lens: PlanningLens;
  constraints?: {
    maxCost?: number;
    maxMonths?: number;
    providerIds?: string[];
  };
  label?: string;
  kind: 'primary' | 'comparison';
}

export interface PathResult {
  nodes: string[];
  edges: string[];
  score?: number;
}

// Block completion logic
export function isBlockComplete(
  block: RequirementBlock, 
  memberCourses: EduCourse[], 
  completedCourseIds: Set<string>
): boolean {
  const doneCount = memberCourses.filter(c => completedCourseIds.has(c.id)).length;
  
  if (block.rule_type === 'ALL') {
    return doneCount === memberCourses.length;
  }
  
  if (block.rule_type === 'K_OF_N') {
    return (block.k ?? 0) <= doneCount;
  }
  
  if (block.rule_type === 'CREDITS') {
    const earned = memberCourses
      .filter(c => completedCourseIds.has(c.id))
      .reduce((sum, c) => sum + c.credits, 0);
    return (block.credits_needed ?? 0) <= earned;
  }
  
  return false;
}

export function getBlockProgressText(block: RequirementBlock, memberCourses: EduCourse[]): string {
  if (block.rule_type === 'ALL') {
    return 'All';
  }
  
  if (block.rule_type === 'K_OF_N') {
    return `Any ${block.k} of ${memberCourses.length}`;
  }
  
  if (block.rule_type === 'CREDITS') {
    return `${block.credits_needed} credits`;
  }
  
  return 'Complete';
}
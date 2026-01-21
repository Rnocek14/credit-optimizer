import type { NodeSelectedSummary } from './nodeProgress';

export interface Course {
  courseId: string;
  title: string;
  credits: number;
  subject: string;
}

export type ProviderType = 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null | undefined;

// Phase 1c: Marketplace option with scoring metadata
export interface MarketplaceOption {
  id: string;
  courseId: string;
  title: string;
  credits: number;
  subject: string;
  provider: string;
  providerType?: ProviderType;
  cost_usd: number | null;
  duration_weeks: number | null;
  
  // Phase 1 additions
  pace_type?: 'self_paced' | 'cohort';
  start_windows?: string[]; // ISO dates
  workload_weekly_hours?: number;
  satisfies_requirements?: string[];
  prereq_course_ids?: string[];
  unlocks_count?: number;
  equivalency_key?: string;
  alt_identifier?: string; // Stable identifier for plan rehydration
  alt_source_code?: string; // Normalized provider code for linking
  cri_score?: number; // Phase 1c: CRI quality score
  
  // CRI signals from provider registry
  aceNccrs?: boolean; // ACE/NCCRS accreditation
  proctored?: boolean; // Proctored assessment
  providerRep?: number; // Provider reputation score
  
  // Alt-credit classification (for policy cap enforcement)
  isAltCredit?: boolean; // Explicit alt-credit flag for cap tracking
  
  // Phase 1b: Scoring metadata (added by scoring engine)
  score?: number;
  scoreBreakdown?: {
    cost: number;
    time: number;
    quality: number;
    cri: number;
    total: number;
  };
  
  // Phase 1b: Auto-fill reasoning
  reason?: string;
  autoFillReason?: string;
  
  // Phase 1c: Provider code for transfer rules
  providerCode?: string;
  level?: number; // Course level (100/200/300/400) for upper-division tracking
  blockId?: string; // Requirement block this course fulfills (for Credit Optimizer matching)
}

export interface ScoringWeights {
  cost: number;
  time: number;
  cri: number;
}

export interface ModuleData {
  id: string;
  label: string;
  icon: string;
  description: string;
  courses: Course[];
  creditsEarned: number;
  creditsRequired: number;
  isCollapsed: boolean;
  
  // Available options for this module
  optionsCount: number; // Required: always derived from marketplaceOptions.length
  marketplaceOptions?: MarketplaceOption[];
  cheapestOption?: number | null;
  
  // Canonical requirement mapping
  requiredCanonicalIds?: string[];
  
  // Progress visualization (from basket selections)
  selectedSummary?: NodeSelectedSummary;
  
  // Week 1: Anchor-aware year planning
  requirement_block_id?: string; // Links module to degree requirement
  fulfills_area?: 'foundation' | 'core' | 'major' | 'capstone' | 'elective';
  upper_division?: boolean; // Counts toward upper-division minimum (300/400 level)
  year?: number; // Year this module belongs to
  
  // Phase 1: Dynamic module provider support
  requirementArea?: string; // For template-based modules (e.g., "WRITTEN_COMM")
  
  // Cap-limited: true when slot was flipped from alt-credit to institutional due to cap
  isCapLimited?: boolean;
}

export interface Requirement {
  id: string;
  label: string;
  level: string;
  icon: string;
  description: string;
  minCredits: number;
  courseIds: string[];
}

export type LoadHealth = 'balanced' | 'underloaded' | 'overloaded';

export interface CreditsSummary {
  planned: number;
  required: number;
}

export interface ModulesSummary {
  total: number;
  completed: number;
  inProgress: number;
}

export interface DegreeSummary {
  degreeTitle: string;
  degreeLevel: 'bachelor' | 'associate' | 'master';
  totalCreditsRequired: number;
  totalCreditsPlanned: number;
  totalCreditsEarned: number;
  estimatedMonths: number;
  estimatedCost: number;
  warnings: string[];
}

export type DegreeStatus = 'on-track' | 'ahead' | 'behind';

// UI hint for opening year panel with specific focus
export interface YearPanelHint {
  focusTab?: 'templates' | 'unmet';
  focusTerm?: 'fall' | 'spring';
}

// Phase 2: Semester planning
export interface SemesterLane {
  id: string;
  year: number;
  term: 'fall' | 'spring';
  courses: PlacedCourse[];
  credits: number;
  workload_hours: number;
}

export interface PlacedCourse {
  courseId: string;
  title: string;
  credits: number;
  provider: string;
  providerType?: ProviderType;
  cri_score?: number;
}

// Phase 1c: Plan scenario for save/load/compare
export interface PlanScenario {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  items: Array<{
    moduleId: string;
    courseId: string;
    title?: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    workload_weekly_hours: number;
    cri_score: number;
    status: 'pinned' | 'auto-filled' | 'prereq';
    providerType?: ProviderType;
    source?: {
      type: 'template' | 'manual' | 'prereq';
      templateId?: string;
      templateVersion?: number;
      templateLabel?: string;
    };
    autoFillReason?: string;
  }>;
  constraints: {
    max_budget_usd?: number;
    target_graduation_date?: Date;
    max_weekly_hours?: number;
    min_cri_score?: number;
    max_ace_credits?: number;
    max_concurrent_courses?: number;
  };
  totals: {
    totalCost: number;
    totalWeeks: number;
    avgCRI: number;
    totalWorkloadHours: number;
    aceCredits: number;
  };
}

/**
 * Normalize module data with derived fields
 * Ensures optionsCount is always in sync with marketplaceOptions
 */
export function normalizeModuleData(partial: Omit<ModuleData, 'optionsCount'>): ModuleData {
  return {
    ...partial,
    optionsCount: partial.marketplaceOptions?.length ?? 0,
  };
}

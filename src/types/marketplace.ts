// Course Marketplace Types

export type ProviderType = 'university' | 'mooc' | 'bootcamp' | 'testing_center';
export type ModalityType = 'online' | 'in_person' | 'hybrid';
export type OptionKind = 'course' | 'exam' | 'cert';
export type RuleKind = 'residency_min' | 'transfer_max' | 'upper_division_min' | 'provider_blacklist' | 'time_limit';
export type PlanStatus = 'planned' | 'enrolled' | 'complete' | 'dropped';
export type TransferSource = 'ACE' | 'NCCRS' | 'CLEP' | 'XFER' | 'HOME' | 'DSST';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  accreditation?: string;
  country: string;
  website_url?: string;
  policies?: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceCourse {
  id: string;
  provider_id: string;
  code: string;
  title: string;
  description?: string;
  credits: number;
  level?: number;
  modality: ModalityType;
  duration_weeks?: number;
  cost_usd?: number;
  start_dates?: string[];
  syllabus_text?: string;
  skill_tags?: string[];
  cri_score?: number;
  instructor_rating?: number;
  completion_rate?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquivalenceGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface EquivalenceGroupMember {
  id: string;
  group_id: string;
  course_id: string;
  source: string;
  confidence: number;
  created_at: string;
}

export interface ProgramRequirement {
  id: string;
  program_id: string;
  track_id?: string;
  requirement_block_id?: string;
  year?: number;
  category: string;
  name: string;
  description?: string;
  credits_required: number;
  min_select: number;
  max_select?: number;
  created_at: string;
}

export interface RequirementOption {
  id: string;
  requirement_id: string;
  option_kind: OptionKind;
  option_ref_id: string;
  min_grade?: string;
  credits_awarded?: number;
  transfer_eligible: boolean;
  notes?: string;
  created_at: string;
}

export interface TransferRule {
  id: string;
  to_program_id: string;
  rule_kind: RuleKind;
  value: number;
  details?: Record<string, unknown>;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface CoursePrereq {
  id: string;
  course_id: string;
  prereq_course_id?: string;
  prereq_skill_id?: string;
  min_grade: string;
  required: boolean;
  created_at: string;
}

export interface UserPlan {
  id: string;
  user_id: string;
  program_id: string;
  track_id?: string;
  name: string;
  target_graduation?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserPlanCourse {
  id: string;
  plan_id: string;
  requirement_id?: string;
  course_id: string;
  provider_id: string;
  planned_term?: string;
  status: PlanStatus;
  transfer_source?: TransferSource;
  grade?: string;
  credits_earned?: number;
  cost_paid?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced types for UI
export interface CourseWithProvider extends MarketplaceCourse {
  provider?: Provider;
}

export interface RequirementWithOptions extends ProgramRequirement {
  options?: RequirementOption[];
  optionsCount?: number;
  hasAceCredit?: boolean;
  hasClep?: boolean;
}

export interface PlanEvaluation {
  credits_total: number;
  transfer_used: number;
  residency_progress: number;
  upper_division_credits: number;
  unmet_prereqs: Array<{
    course_id: string;
    missing: string[];
  }>;
  warnings: string[];
  estimated_cost: number;
  estimated_completion_date?: string;
}

export interface CourseSearchFilters {
  requirement_id?: string;
  provider_types?: ProviderType[];
  modality?: ModalityType[];
  max_cost?: number;
  min_cost?: number;
  max_duration_weeks?: number;
  skill_tags?: string[];
  min_cri_score?: number;
  level?: number[];
  start_date_after?: string;
}

export interface CourseSearchResult extends CourseWithProvider {
  transfer_fit?: 'excellent' | 'good' | 'fair' | 'poor';
  transfer_fit_reason?: string;
  estimated_cri_change?: number;
}
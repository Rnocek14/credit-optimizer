import type {
  DegreeTemplate,
  TemplateTerm,
  TemplateSlot,
  TemplateCourseOption,
  RequirementArea,
  TrackType,
  InstitutionCode,
} from '@/types/degreeTemplates';

export interface OptimizerPreferences {
  // v1: very simple, expand later
  avoidExams?: boolean;          // e.g., no CLEP/DSST
  preferSophia?: boolean;        // if both Sophia and Study.com exist
  maxMonthlyBudgetUsd?: number | null;
}

export type OptimizerMode = 'cost_min' | 'time_min' | 'alt_max' | 'standard_like';

export interface SelectedOption {
  slotId: string;
  requirementArea: RequirementArea;
  kind: TemplateSlot['kind'];
  chosen: TemplateCourseOption;
  // Resolved info:
  sourceType: 'institutional' | 'alt_credit';
  sourceCode?: string;          // CLEP, DSST, etc. for alt credits
  identifier?: string;          // alt credit identifier
  courseCode?: string;          // institutional course
  credits: number;
  estCostUsd: number;           // approximate
}

export interface HydratedTerm {
  id: string;
  label: string;
  slots: SelectedOption[];
  termCredits: number;
}

export interface OptimizedPlanMetrics {
  totalCredits: number;
  totalAltCredits: number;
  totalInstitutionalCredits: number;
  estTotalCostUsd: number;
  estDurationMonths: number | null;
  // TESU-specific caps:
  altCreditCap: number | null;
  totalTransferCap: number | null;
  minResidencyRequired: number | null;
  // Fulfillment:
  genedCreditsByCategory: Record<string, number>; // WRITTEN_COMM -> 6, etc.
}

export interface OptimizedPlanWarnings {
  exceedsAltCreditCap?: boolean;
  exceedsTotalTransferCap?: boolean;
  belowResidencyMin?: boolean;
  missingGenEdCredits?: string[]; // category codes not fully satisfied
}

export interface OptimizedPlanResult {
  institutionCode: InstitutionCode;
  programCode: string;
  trackType: TrackType;
  mode: OptimizerMode;
  templateId: string;
  hydratedTerms: HydratedTerm[];
  metrics: OptimizedPlanMetrics;
  warnings: OptimizedPlanWarnings;
}

import type { InstitutionCode, RequirementArea } from '@/types/degreeTemplates';

export type TermCode = 'FALL' | 'SPRING' | 'SUMMER' | 'WINTER';

export interface PlanCourse {
  id: string;
  courseCode: string | null;
  title?: string | null;
  sourceType: 'institutional' | 'alt_credit';
  sourceCode?: string | null;
  altIdentifier?: string | null;
  credits: number;
  requirementArea: RequirementArea;
  requirementBlockSlug?: string | null;
  termId: string;
  notes?: string | null;
}

export interface PlanTerm {
  id: string;
  label: string;
  yearIndex: number;
  termIndex: number;
  termCode?: TermCode;
  totalCredits: number;
  courses: PlanCourse[];
}

export interface PlanBasket {
  id: string;
  institutionCode: InstitutionCode;
  programCode: string;
  trackType: string;
  templateId: string;
  mode: string;
  totalCredits: number;
  totalAltCredits: number;
  totalInstitutionalCredits: number;
  estTotalCostUsd: number;
  terms: PlanTerm[];
}

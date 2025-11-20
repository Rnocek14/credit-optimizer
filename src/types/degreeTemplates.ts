// Matches your Phase 1 schema
export type TrackType = 'standard' | 'fastest' | 'cheapest' | 'alt_max' | 'hybrid';

export type InstitutionCode =
  | 'TESU'
  | 'COSC'
  | 'EXCELSIOR'
  | 'WGU'
  | 'SNHU'
  | 'UMGC'
  | 'PURDUE_GLOBAL';

// RequirementAreas should line up with gened_categories.category_code
// and/or requirement_blocks.slug
export type RequirementArea =
  | 'WRITTEN_COMM'
  | 'QUANTITATIVE'
  | 'HUMANITIES'
  | 'SOCIAL_SCIENCE'
  | 'NATURAL_SCIENCE'
  | 'ORAL_COMM'
  | 'CIVIC_GLOBAL'
  | 'BUS_CORE'
  | 'CAPSTONE'
  | 'FREE_ELECTIVE'
  | 'UPPER_BUSINESS';

export type TemplateOptionType =
  | 'institutional_course'
  | 'alt_credit';

export interface TemplateCourseOptionBase {
  type: TemplateOptionType;
}

// Institutional course option
export interface TemplateInstitutionalCourseOption extends TemplateCourseOptionBase {
  type: 'institutional_course';
  courseCode: string; // e.g., 'ENC-101'
}

// Alt-credit option (CLEP, DSST, Sophia, Study.com, etc.)
export interface TemplateAltCreditOption extends TemplateCourseOptionBase {
  type: 'alt_credit';
  sourceCode: 'CLEP' | 'DSST' | 'SOPHIA' | 'STUDY_COM'; // matches alt_credits.source_code
  identifier: string; // matches alt_credits.identifier
}

export type TemplateCourseOption =
  | TemplateInstitutionalCourseOption
  | TemplateAltCreditOption;

export interface TemplateSlot {
  slotId: string;
  requirementArea: RequirementArea;
  kind: 'gened' | 'major' | 'elective' | 'capstone';
  minCredits: number;
  preferred: TemplateCourseOption;
  alternatives?: TemplateCourseOption[];
}

export interface TemplateTerm {
  id: string;   // e.g. 'y1-t1'
  label: string;
  slots: TemplateSlot[];
}

// Raw DB row from degree_templates
export interface DegreeTemplateRow {
  id: string;
  institution_id: string;
  institution_code: InstitutionCode;
  program_code: string; // 'BSBA', 'BSCS', etc.
  track_type: TrackType;
  total_credits: number;
  estimated_cost: number | null;
  estimated_duration_months: number | null;
  template_data: unknown; // JSONB in DB
}

// Hydrated template with typed template_data
export interface DegreeTemplate extends Omit<DegreeTemplateRow, 'template_data'> {
  template_data: {
    programCode: string;
    trackType: TrackType;
    totalCredits: number;
    terms: TemplateTerm[];
  };
}

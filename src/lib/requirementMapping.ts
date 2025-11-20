import type { InstitutionCode, RequirementArea } from '@/types/degreeTemplates';

interface RequirementMapping {
  genedCategoryCode?: string;   // for GenEd blocks
  requirementBlockSlug?: string; // your existing RequirementBlock slug
}

// This can be institution-specific if needed, but start with TESU-only
const TESU_REQUIREMENT_MAPPINGS: Record<RequirementArea, RequirementMapping> = {
  WRITTEN_COMM: {
    genedCategoryCode: 'WRITTEN_COMM',
    requirementBlockSlug: 'tesu_gened_written_comm',
  },
  QUANTITATIVE: {
    genedCategoryCode: 'QUANTITATIVE',
    requirementBlockSlug: 'tesu_gened_quantitative',
  },
  HUMANITIES: {
    genedCategoryCode: 'HUMANITIES',
    requirementBlockSlug: 'tesu_gened_humanities',
  },
  SOCIAL_SCIENCE: {
    genedCategoryCode: 'SOCIAL_SCIENCE',
    requirementBlockSlug: 'tesu_gened_social_science',
  },
  NATURAL_SCIENCE: {
    genedCategoryCode: 'NATURAL_SCIENCE',
    requirementBlockSlug: 'tesu_gened_natural_science',
  },
  ORAL_COMM: {
    genedCategoryCode: 'ORAL_COMM',
    requirementBlockSlug: 'tesu_gened_oral_comm',
  },
  CIVIC_GLOBAL: {
    genedCategoryCode: 'CIVIC_GLOBAL',
    requirementBlockSlug: 'tesu_gened_civic_global',
  },
  BUS_CORE: {
    requirementBlockSlug: 'tesu_bsba_business_core',
  },
  CAPSTONE: {
    requirementBlockSlug: 'tesu_bsba_capstone',
  },
  FREE_ELECTIVE: {
    requirementBlockSlug: 'tesu_bsba_free_electives',
  },
  UPPER_BUSINESS: {
    requirementBlockSlug: 'tesu_bsba_upper_business',
  },
};

// COSC (Charter Oak State College) requirement mappings
const COSC_REQUIREMENT_MAPPINGS: Record<RequirementArea, RequirementMapping> = {
  WRITTEN_COMM: {
    genedCategoryCode: 'WRITTEN_COMM',
    requirementBlockSlug: 'cosc_gened_written_comm',
  },
  QUANTITATIVE: {
    genedCategoryCode: 'QUANTITATIVE',
    requirementBlockSlug: 'cosc_gened_quantitative',
  },
  HUMANITIES: {
    genedCategoryCode: 'HUMANITIES',
    requirementBlockSlug: 'cosc_gened_humanities',
  },
  SOCIAL_SCIENCE: {
    genedCategoryCode: 'SOCIAL_SCIENCE',
    requirementBlockSlug: 'cosc_gened_social_science',
  },
  NATURAL_SCIENCE: {
    genedCategoryCode: 'LAB_SCIENCE',
    requirementBlockSlug: 'cosc_gened_lab_science',
  },
  ORAL_COMM: {
    genedCategoryCode: 'ORAL_COMM',
    requirementBlockSlug: 'cosc_gened_oral_comm',
  },
  CIVIC_GLOBAL: {
    genedCategoryCode: 'GLOBAL',
    requirementBlockSlug: 'cosc_gened_global',
  },
  BUS_CORE: {
    requirementBlockSlug: 'cosc_bsba_business_core',
  },
  CAPSTONE: {
    requirementBlockSlug: 'cosc_bsba_capstone',
  },
  FREE_ELECTIVE: {
    requirementBlockSlug: 'cosc_bsba_free_electives',
  },
  UPPER_BUSINESS: {
    requirementBlockSlug: 'cosc_bsba_upper_business',
  },
};

export function mapRequirementArea(
  institutionCode: InstitutionCode,
  area: RequirementArea
): RequirementMapping | null {
  switch (institutionCode) {
    case 'TESU':
      return TESU_REQUIREMENT_MAPPINGS[area] ?? null;
    case 'COSC':
      return COSC_REQUIREMENT_MAPPINGS[area] ?? null;
    default:
      return null;
  }
}

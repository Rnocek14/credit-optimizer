import type { OptimizedPlanResult, SelectedOption } from '@/types/optimizer';
import type { PlanBasket, PlanTerm, PlanCourse } from '@/types/planBasket';
import type { InstitutionCode } from '@/types/degreeTemplates';
import { mapRequirementArea } from '@/lib/requirementMapping';

function parseTermId(termId: string): { yearIndex: number; termIndex: number } {
  const match = /^y(\d+)-t(\d+)$/.exec(termId);
  if (!match) {
    return { yearIndex: 1, termIndex: 1 };
  }
  return {
    yearIndex: Number(match[1]) || 1,
    termIndex: Number(match[2]) || 1,
  };
}

function makePlanCourseFromSlot(
  institutionCode: InstitutionCode,
  templateId: string,
  termId: string,
  slot: SelectedOption,
): PlanCourse {
  const mapping = mapRequirementArea(institutionCode, slot.requirementArea);

  return {
    id: `${templateId}::${termId}::${slot.slotId}`,
    courseCode: slot.courseCode ?? null,
    title: null,
    sourceType: slot.sourceType,
    sourceCode: slot.sourceType === 'alt_credit' ? slot.sourceCode ?? null : null,
    altIdentifier: slot.sourceType === 'alt_credit' ? slot.identifier ?? null : null,
    credits: slot.credits,
    requirementArea: slot.requirementArea,
    requirementBlockSlug: mapping?.requirementBlockSlug ?? null,
    termId,
    notes: null,
  };
}

/**
 * Transform an OptimizedPlanResult from the Credit Optimizer
 * into a PlanBasket compatible with Edu-Tree / Planner.
 */
export function transformOptimizedPlanToPlanBasket(
  optimized: OptimizedPlanResult,
): PlanBasket {
  const {
    institutionCode,
    programCode,
    trackType,
    mode,
    templateId,
    hydratedTerms,
    metrics,
  } = optimized;

  const terms: PlanTerm[] = hydratedTerms.map((term) => {
    const { yearIndex, termIndex } = parseTermId(term.id);

    const courses: PlanCourse[] = term.slots.map((slot) =>
      makePlanCourseFromSlot(institutionCode, templateId, term.id, slot),
    );

    return {
      id: term.id,
      label: term.label,
      yearIndex,
      termIndex,
      termCode: undefined,
      totalCredits: term.termCredits,
      courses,
    };
  });

  return {
    id: `basket::${templateId}::${mode}`,
    institutionCode,
    programCode,
    trackType,
    templateId,
    mode,
    totalCredits: metrics.totalCredits,
    totalAltCredits: metrics.totalAltCredits,
    totalInstitutionalCredits: metrics.totalInstitutionalCredits,
    estTotalCostUsd: metrics.estTotalCostUsd,
    terms,
  };
}

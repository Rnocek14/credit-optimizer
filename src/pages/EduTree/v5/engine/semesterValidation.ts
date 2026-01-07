import type { MarketplaceOption } from '../types/v5';

export type ValidationErrorCode = 
  | 'ALREADY_PLACED'
  | 'TERM_CAP' 
  | 'YEAR_CAP' 
  | 'PREREQ' 
  | 'ACE_CAP' 
  | 'EXCLUSION';

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
}

export interface ValidationFix {
  label: string;
  semesterId: string;
  apply: () => void;
}

export interface Validation {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  fixes: ValidationFix[];
}

interface SemesterState {
  credits: number;
  workloadHours: number;
  courseIds: string[];
}

interface PlanState {
  semesters: Record<string, SemesterState>;
}

interface Constraints {
  termCap?: number;
  yearCap?: number;
  aceCap?: number;
}

/**
 * Validate whether a course can be dropped into a semester
 */
export function validateSemesterDrop({
  course,
  semesterId,
  plan,
  constraints
}: {
  course: MarketplaceOption;
  semesterId: string;
  plan: PlanState;
  constraints: Constraints;
}): Validation {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const fixes: ValidationFix[] = [];

  const termCap = constraints.termCap ?? 15;
  const yearCap = constraints.yearCap ?? 30;
  
  const courseCredits = course.credits ?? 0;
  const currentSemester = plan.semesters[semesterId] || { credits: 0, workloadHours: 0, courseIds: [] };

  // 1. Check if already placed in this semester
  if (currentSemester.courseIds.includes(course.id) || currentSemester.courseIds.includes(course.courseId)) {
    errors.push({
      code: 'ALREADY_PLACED',
      message: 'This course is already in this semester'
    });
    return { valid: false, errors, warnings, fixes };
  }

  // 2. Check term credit cap
  const newTermCredits = currentSemester.credits + courseCredits;
  if (newTermCredits > termCap) {
    errors.push({
      code: 'TERM_CAP',
      message: `Semester cap exceeded (${newTermCredits}/${termCap} cr)`
    });

    // Suggest moving to alternate semester
    const [yearStr, term] = semesterId.split('-');
    const alternateTerm = term === 'fall' ? 'spring' : 'fall';
    const alternateSemesterId = `${yearStr}-${alternateTerm}`;
    const alternateSemester = plan.semesters[alternateSemesterId] || { credits: 0, workloadHours: 0, courseIds: [] };
    
    if (alternateSemester.credits + courseCredits <= termCap) {
      fixes.push({
        label: `Move to ${alternateTerm.charAt(0).toUpperCase() + alternateTerm.slice(1)}`,
        semesterId: alternateSemesterId,
        apply: () => {} // Will be wired in handler
      });
    }
  }

  // 3. Check year credit cap (sum of fall + spring)
  const [yearStr] = semesterId.split('-');
  const fallSemester = plan.semesters[`${yearStr}-fall`] || { credits: 0, workloadHours: 0, courseIds: [] };
  const springSemester = plan.semesters[`${yearStr}-spring`] || { credits: 0, workloadHours: 0, courseIds: [] };
  
  // Calculate new year total
  const isFall = semesterId.includes('fall');
  const newYearCredits = fallSemester.credits + springSemester.credits + courseCredits - (isFall ? fallSemester.credits : springSemester.credits) + (isFall ? newTermCredits - courseCredits : currentSemester.credits);
  const actualYearTotal = fallSemester.credits + springSemester.credits + (currentSemester.credits === fallSemester.credits || currentSemester.credits === springSemester.credits ? 0 : courseCredits);
  
  if (actualYearTotal > yearCap) {
    errors.push({
      code: 'YEAR_CAP',
      message: `Year cap exceeded (${actualYearTotal}/${yearCap} cr)`
    });
  }

  // 4. Check prerequisites - now enforced as errors when unmet
  if (course.prereq_course_ids && course.prereq_course_ids.length > 0) {
    // Get all courses placed in earlier semesters
    const [targetYear, targetTerm] = semesterId.split('-');
    const targetYearNum = parseInt(targetYear) || 1;
    const targetTermNum = targetTerm === 'fall' ? 0 : targetTerm === 'spring' ? 1 : 2;
    
    // Collect all course IDs from prior semesters
    const priorCourseIds = new Set<string>();
    for (const [semId, semState] of Object.entries(plan.semesters)) {
      const [yearStr, term] = semId.split('-');
      const yearNum = parseInt(yearStr) || 1;
      const termNum = term === 'fall' ? 0 : term === 'spring' ? 1 : 2;
      
      // Check if this semester is before the target
      const isBefore = yearNum < targetYearNum || 
        (yearNum === targetYearNum && termNum < targetTermNum);
      
      if (isBefore) {
        semState.courseIds.forEach(id => priorCourseIds.add(id));
      }
    }
    
    // Check which prereqs are missing
    const missingPrereqs = course.prereq_course_ids.filter(
      prereqId => !priorCourseIds.has(prereqId)
    );
    
    if (missingPrereqs.length > 0) {
      errors.push({
        code: 'PREREQ',
        message: `Missing prerequisite(s): ${missingPrereqs.join(', ')} must be completed first`
      });
      
      // Suggest placing in a later semester
      const nextYear = targetTerm === 'spring' ? targetYearNum + 1 : targetYearNum;
      const nextTerm = targetTerm === 'fall' ? 'spring' : 'fall';
      const suggestedSemester = `${nextYear}-${nextTerm}`;
      
      fixes.push({
        label: `Move to ${nextTerm.charAt(0).toUpperCase() + nextTerm.slice(1)} ${nextYear}`,
        semesterId: suggestedSemester,
        apply: () => {}
      });
    } else {
      // All prereqs satisfied - just show info
      warnings.push(`Prerequisites satisfied: ${course.prereq_course_ids.join(', ')}`);
    }
  }

  // 5. Check ACE cap (placeholder - would need full plan context)
  // This is a simplified check; full implementation would sum ACE credits across all years
  if (constraints.aceCap) {
    // TODO: Implement full ACE tracking when is_ace_approved field is added
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixes
  };
}

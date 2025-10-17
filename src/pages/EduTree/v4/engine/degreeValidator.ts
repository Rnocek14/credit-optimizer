/**
 * Degree Validator - Academic requirement validation logic
 */
import { PlanNode, DegreeRequirements, ValidationResult, NodeType, SubRequirement, SubRequirementStatus } from '../types/v4';

/**
 * Validate sub-requirements (granular course-level requirements)
 */
function validateSubRequirements(
  courses: PlanNode[],
  subRequirements: SubRequirement[]
): SubRequirementStatus[] {
  return subRequirements.map(subReq => {
    const completed: string[] = [];
    let creditsEarned = 0;
    
    if (subReq.type === 'all-required' || subReq.type === 'select-n') {
      // Check specific courses
      const courseIds = subReq.courseIds || [];
      courseIds.forEach(courseId => {
        const course = courses.find(c => c.data.label === courseId);
        if (course) {
          completed.push(courseId);
        }
      });
      
      const isComplete = subReq.type === 'all-required'
        ? completed.length === courseIds.length
        : completed.length >= (subReq.requiredCount || 0);
      
      const missing = courseIds.filter(id => !completed.includes(id));
      
      return {
        subReqId: subReq.id,
        label: subReq.label,
        completed,
        missing: isComplete ? [] : missing.slice(0, subReq.type === 'select-n' ? (subReq.requiredCount || 0) - completed.length : missing.length),
        creditsEarned: completed.reduce((sum, courseId) => {
          const course = courses.find(c => c.data.label === courseId);
          return sum + (course?.data.credits || 0);
        }, 0),
        creditsNeeded: subReq.minCredits || 0,
        isComplete,
      };
    }
    
    if (subReq.type === 'select-any') {
      // Sum credits by tag
      const matchingCourses = courses.filter(c => 
        c.data.category === subReq.tag || 
        c.data.skillTags?.includes(subReq.tag || '')
      );
      
      matchingCourses.forEach(course => {
        completed.push(course.data.label);
        creditsEarned += course.data.credits || 0;
      });
      
      const minCredits = subReq.minCredits || 0;
      const isComplete = creditsEarned >= minCredits;
      
      return {
        subReqId: subReq.id,
        label: subReq.label,
        completed,
        missing: [],
        creditsEarned,
        creditsNeeded: minCredits,
        isComplete,
      };
    }
    
    // Fallback
    return {
      subReqId: subReq.id,
      label: subReq.label,
      completed: [],
      missing: [],
      creditsEarned: 0,
      creditsNeeded: 0,
      isComplete: false,
    };
  });
}

export function validateDegree(
  nodes: PlanNode[],
  requirements: DegreeRequirements
): ValidationResult {
  // 1. Filter course nodes only (exclude year markers and ghost nodes)
  const courses = nodes.filter(
    n => n.type === NodeType.Course && 
         n.data.status !== 'unplanned' &&
         !n.className?.includes('ghost-node')
  );
  
  // 2. Calculate total credits
  const totalPlanned = courses.reduce((sum, n) => sum + (n.data.credits || 0), 0);
  
  // 3. Calculate by category
  const byCategory = new Map<string, { planned: number; required: number }>();
  Object.entries(requirements.categories).forEach(([cat, req]) => {
    const catCredits = courses
      .filter(n => n.data.category === cat)
      .reduce((sum, n) => sum + (n.data.credits || 0), 0);
    byCategory.set(cat, { planned: catCredits, required: req.required });
  });
  
  // 4. Detect missing requirements
  const missing: string[] = [];
  byCategory.forEach((val, cat) => {
    if (val.planned < val.required) {
      const label = requirements.categories[cat as keyof typeof requirements.categories]?.label || cat;
      missing.push(`${label}: ${val.required - val.planned} credits needed`);
    }
  });
  
  // 5. Check capstone
  const hasCapstone = courses.some(n => n.data.category === 'capstone');
  if (requirements.categories.capstone.required > 0 && !hasCapstone) {
    missing.push('Capstone course required');
  }
  
  // 6. Validate sub-requirements (if defined)
  let bySubRequirement: SubRequirementStatus[] | undefined;
  if (requirements.subRequirements && requirements.subRequirements.length > 0) {
    bySubRequirement = validateSubRequirements(courses, requirements.subRequirements);
    
    // Add specific missing courses to missing array
    bySubRequirement.forEach(subReq => {
      if (!subReq.isComplete) {
        if (subReq.missing.length > 0) {
          // For 'all-required' and 'select-n', list specific courses
          const missingStr = subReq.missing.length === 1
            ? `${subReq.label}: Need ${subReq.missing[0]}`
            : `${subReq.label}: Need ${subReq.missing.slice(0, 3).join(', ')}${subReq.missing.length > 3 ? '...' : ''}`;
          missing.push(missingStr);
        } else if (subReq.creditsNeeded > subReq.creditsEarned) {
          // For 'select-any', show credit deficit
          missing.push(`${subReq.label}: ${subReq.creditsNeeded - subReq.creditsEarned} more credits needed`);
        }
      }
    });
  }
  
  // 7. Warnings (overloaded semesters, residency, etc.)
  const warnings: string[] = [];
  
  // Check total credits shortfall
  if (totalPlanned < requirements.totalCredits) {
    warnings.push(`${requirements.totalCredits - totalPlanned} credits needed to graduate`);
  }
  
  // Check residency requirement
  const transferCredits = courses
    .filter(n => n.data.category === 'transfer')
    .reduce((sum, n) => sum + (n.data.credits || 0), 0);
  const residencyMin = requirements.residencyMinimum || 30;
  if (totalPlanned - transferCredits < residencyMin) {
    warnings.push(`Need ${residencyMin - (totalPlanned - transferCredits)} more in-residence credits`);
  }
  
  return {
    totalCredits: { planned: totalPlanned, required: requirements.totalCredits },
    byCategory,
    missing,
    warnings,
    isValid: missing.length === 0 && totalPlanned >= requirements.totalCredits,
    bySubRequirement,
  };
}

/**
 * Migration Helper - Annotate courses with moduleId based on hierarchical requirements
 */
import { PlanNode } from '../types/v4';
import { HierarchicalRequirement, flattenRequirements } from '../types/requirementsHierarchy';

/**
 * Annotate course nodes with correct moduleId based on hierarchical requirements
 */
export function annotateCourseModules(
  courses: PlanNode[],
  requirements: HierarchicalRequirement[]
): PlanNode[] {
  const flatRequirements = flattenRequirements(requirements);
  
  return courses.map(course => {
    // Skip if already has moduleId
    if (course.data.moduleId) {
      return course;
    }
    
    // Find which requirement this course satisfies
    const matchingReq = flatRequirements.find(req => {
      if (req.level !== 'sequence') return false; // Only sequences contain courses
      
      if (req.type === 'all-required' || req.type === 'select-n') {
        // Check if course label matches any courseId
        return req.courseIds?.includes(course.data.label);
      }
      
      if (req.type === 'select-any') {
        // Check if course category or tags match
        return course.data.category === req.tag || 
               course.data.skillTags?.includes(req.tag || '');
      }
      
      return false;
    });
    
    if (matchingReq) {
      return {
        ...course,
        data: {
          ...course.data,
          moduleId: matchingReq.id
        }
      };
    }
    
    // No match found - course will be rendered in flat grid
    console.warn(`[Migration] No module match for course: ${course.data.label}`);
    return course;
  });
}

/**
 * Validate that all courses in a plan are properly assigned to modules
 */
export function validateModuleAssignments(
  courses: PlanNode[],
  requirements: HierarchicalRequirement[]
): { valid: boolean; unassigned: string[]; invalid: string[] } {
  const sequences = flattenRequirements(requirements).filter(r => r.level === 'sequence');
  const sequenceIds = new Set(sequences.map(s => s.id));
  
  const unassigned: string[] = [];
  const invalid: string[] = [];
  
  courses.forEach(course => {
    if (!course.data.moduleId) {
      unassigned.push(course.data.label);
    } else if (!sequenceIds.has(course.data.moduleId)) {
      invalid.push(course.data.label);
    }
  });
  
  return {
    valid: unassigned.length === 0 && invalid.length === 0,
    unassigned,
    invalid
  };
}

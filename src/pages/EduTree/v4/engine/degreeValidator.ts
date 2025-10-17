/**
 * Degree Validator - Academic requirement validation logic
 */
import { PlanNode, DegreeRequirements, ValidationResult, NodeType } from '../types/v4';

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
  
  // 6. Warnings (overloaded semesters, residency, etc.)
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
    isValid: missing.length === 0 && totalPlanned >= requirements.totalCredits
  };
}

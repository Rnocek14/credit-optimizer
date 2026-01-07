/**
 * Template Validator - Ensures marketplace templates lead to graduation
 * 
 * Validates:
 * 1. Total credits = 120
 * 2. Residency requirements met per anchor school policy
 * 3. Upper-division requirements met (18+ credits at 300/400 level in area of study)
 * 4. COMBINED noncollegiate pool (no fake per-provider caps!)
 * 5. Gen-ed category completeness
 * 6. Each module has sufficient course options to fill creditsRequired
 * 7. ALL courses have verified transfer rules (via templateTransferValidator)
 * 
 * CRITICAL FIX: Uses central policy service instead of hardcoded values
 */

import { validateTemplateTransferability, TemplateTransferValidationResult } from './templateTransferValidator';
import { 
  getPolicyOrDefault, 
  getResidencyCredits,
  validateNoncollegiateCredits as validateNoncollegiate,
  type InstitutionPolicy,
  type GenEdRequirements,
} from '@/lib/degree/institutionPolicies';

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  details?: {
    expected: number;
    actual: number;
    shortfall?: number;
    provider?: string;
    category?: string;
  };
}

export interface TemplateValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  metrics: {
    totalCredits: number;
    universityCredits: number;
    upperDivCredits: number;
    moocCredits: number;
    moduleCount: number;
    filledModules: number;
    unfilledModules: string[];
    creditsByProvider: Record<string, number>;
    genedCreditsByCategory: Record<string, number>;
  };
  transferValidation?: TemplateTransferValidationResult;
}

/**
 * Parse credits from label like "Humanities (6cr)" -> 6
 */
export function parseCreditsFromLabel(label?: string): number {
  if (!label) return 3;
  const match = label.match(/\((\d+)cr\)/);
  return match ? parseInt(match[1], 10) : 3;
}

/**
 * Map requirement area to gen-ed category
 */
function mapToGenEdCategory(requirementArea?: string): string | null {
  const mapping: Record<string, string> = {
    'WRITTEN_COMM': 'WRITTEN_COMM',
    'ORAL_COMM': 'ORAL_COMM',
    'QUANTITATIVE': 'QUANTITATIVE',
    'HUMANITIES': 'HUMANITIES',
    'SOCIAL_SCIENCE': 'SOCIAL_SCIENCE',
    'NATURAL_SCIENCE': 'NATURAL_SCIENCE',
    'CIVIC_GLOBAL': 'CIVIC_GLOBAL',
    'GEN_ED': null,
  };
  return requirementArea ? (mapping[requirementArea] ?? null) : null;
}

/**
 * Validates a marketplace template for graduation requirements
 * Uses central policy service - no hardcoded values
 */
export function validateTemplate(template: any): TemplateValidationResult {
  const issues: ValidationIssue[] = [];
  const anchorSchool = template.anchorSchool || 'TESU';
  
  // Get policy from central service
  const policy = getPolicyOrDefault(anchorSchool);
  const residencyCreditsRequired = getResidencyCredits(anchorSchool);
  const genEdReqs = policy.genEdRequirements;
  
  // Calculate metrics by analyzing all modules and their options
  let totalCredits = 0;
  let universityCredits = 0;
  let upperDivCredits = 0;
  let moocCredits = 0;
  let moduleCount = 0;
  let filledModules = 0;
  const unfilledModules: string[] = [];
  const creditsByProvider: Record<string, number> = {};
  const genedCreditsByCategory: Record<string, number> = {};
  
  for (const yearTemplate of template.yearTemplates || []) {
    for (const moduleTemplate of yearTemplate.moduleTemplates || []) {
      moduleCount++;
      const { options, creditsRequired, label, moduleId, requirementArea } = moduleTemplate;
      const targetCredits = creditsRequired ?? parseCreditsFromLabel(label);
      const totalAvailableCredits = (options || []).reduce(
        (sum: number, opt: any) => sum + (opt.credits || 0), 0
      );
      
      if (totalAvailableCredits >= targetCredits) {
        filledModules++;
        totalCredits += targetCredits;
        
        let creditsNeeded = targetCredits;
        const sortedOptions = [...(options || [])].sort(
          (a: any, b: any) => (b.cri_score ?? 0) - (a.cri_score ?? 0)
        );
        
        for (const opt of sortedOptions) {
          if (creditsNeeded <= 0) break;
          const creditsFromOption = Math.min(opt.credits, creditsNeeded);
          creditsNeeded -= creditsFromOption;
          
          const providerCode = opt.providerCode || 'UNKNOWN';
          creditsByProvider[providerCode] = (creditsByProvider[providerCode] || 0) + creditsFromOption;
          
          if (opt.providerType === 'university') {
            universityCredits += creditsFromOption;
            if ((opt.level || 0) >= 300) upperDivCredits += creditsFromOption;
          } else if (opt.providerType === 'mooc' || opt.providerType === 'testing_center') {
            moocCredits += creditsFromOption;
            if ((opt.level || 0) >= 300) upperDivCredits += creditsFromOption;
          }
        }
        
        const genEdCategory = mapToGenEdCategory(requirementArea);
        if (genEdCategory) {
          genedCreditsByCategory[genEdCategory] = (genedCreditsByCategory[genEdCategory] || 0) + targetCredits;
        }
      } else {
        unfilledModules.push(moduleId);
        totalCredits += totalAvailableCredits;
        
        for (const opt of options || []) {
          const providerCode = opt.providerCode || 'UNKNOWN';
          creditsByProvider[providerCode] = (creditsByProvider[providerCode] || 0) + opt.credits;
          
          if (opt.providerType === 'university') {
            universityCredits += opt.credits;
            if ((opt.level || 0) >= 300) upperDivCredits += opt.credits;
          } else {
            moocCredits += opt.credits;
            if ((opt.level || 0) >= 300) upperDivCredits += opt.credits;
          }
        }
        
        const genEdCategory = mapToGenEdCategory(requirementArea);
        if (genEdCategory) {
          genedCreditsByCategory[genEdCategory] = (genedCreditsByCategory[genEdCategory] || 0) + totalAvailableCredits;
        }
      }
    }
  }
  
  // Validate: Total credits
  if (totalCredits < policy.totalCreditsBachelor) {
    issues.push({
      type: 'error',
      code: 'CREDIT_SHORTFALL',
      message: `Template only provides ${totalCredits} credits, need ${policy.totalCreditsBachelor}`,
      details: { expected: policy.totalCreditsBachelor, actual: totalCredits, shortfall: policy.totalCreditsBachelor - totalCredits },
    });
  }
  
  // Validate: Residency
  if (universityCredits < residencyCreditsRequired) {
    issues.push({
      type: 'error',
      code: 'RESIDENCY_SHORTFALL',
      message: `Only ${universityCredits} university credits, need ${residencyCreditsRequired} for ${anchorSchool} residency`,
      details: { expected: residencyCreditsRequired, actual: universityCredits, shortfall: residencyCreditsRequired - universityCredits },
    });
  }
  
  // Validate: Upper-division
  const upperDivRequired = policy.upperDivisionAreaOfStudyMin;
  if (upperDivRequired > 0 && upperDivCredits < upperDivRequired) {
    issues.push({
      type: 'error',
      code: 'UPPER_DIV_SHORTFALL',
      message: `Only ${upperDivCredits} upper-division credits, need ${upperDivRequired}`,
      details: { expected: upperDivRequired, actual: upperDivCredits, shortfall: upperDivRequired - upperDivCredits },
    });
  }
  
  // Validate: COMBINED noncollegiate pool (no fake per-provider caps!)
  const noncollegiateIssues = validateNoncollegiate(anchorSchool, creditsByProvider, 'bachelor');
  for (const issue of noncollegiateIssues) {
    issues.push({
      type: issue.type,
      code: issue.code,
      message: issue.message,
      details: issue.details as any,
    });
  }
  
  // Validate: Gen-ed completeness
  for (const [category, required] of Object.entries(genEdReqs)) {
    if (required === 0) continue;
    const earned = genedCreditsByCategory[category] || 0;
    if (earned < required) {
      issues.push({
        type: 'warning',
        code: 'GENED_INCOMPLETE',
        message: `${category}: Only ${earned}/${required} credits`,
        details: { expected: required, actual: earned, shortfall: required - earned, category },
      });
    }
  }
  
  // Validate: Unfilled modules
  if (unfilledModules.length > 0) {
    issues.push({
      type: 'warning',
      code: 'UNFILLED_MODULES',
      message: `${unfilledModules.length} module(s) don't have enough course options: ${unfilledModules.join(', ')}`,
      details: { expected: 0, actual: unfilledModules.length },
    });
  }
  
  const hasErrors = issues.filter(i => i.type === 'error').length > 0;
  
  return {
    valid: !hasErrors,
    issues,
    metrics: { totalCredits, universityCredits, upperDivCredits, moocCredits, moduleCount, filledModules, unfilledModules, creditsByProvider, genedCreditsByCategory },
  };
}

/**
 * Full validation including async transfer rule verification
 */
export async function validateTemplateWithTransfers(template: any): Promise<TemplateValidationResult> {
  const baseResult = validateTemplate(template);
  const transferResult = await validateTemplateTransferability(template);
  
  if (!transferResult.valid) {
    baseResult.issues.push({
      type: 'error',
      code: 'UNVERIFIED_TRANSFERS',
      message: `${transferResult.unverifiedCourses} course(s) have no verified transfer rule to ${transferResult.anchorSchool}`,
      details: { expected: 0, actual: transferResult.unverifiedCourses },
    });
    baseResult.valid = false;
  }
  
  if (transferResult.electiveOnlyCourses > 0) {
    baseResult.issues.push({
      type: 'warning',
      code: 'ELECTIVE_ONLY_TRANSFERS',
      message: `${transferResult.electiveOnlyCourses} course(s) transfer as elective credit only`,
      details: { expected: 0, actual: transferResult.electiveOnlyCourses },
    });
  }
  
  return { ...baseResult, transferValidation: transferResult };
}

/**
 * Validates all templates in a template array
 */
export function validateAllTemplates(templates: any[]): Record<string, TemplateValidationResult> {
  const results: Record<string, TemplateValidationResult> = {};
  for (const template of templates) {
    if (!template.id) continue;
    results[template.id] = validateTemplate(template);
  }
  return results;
}

/**
 * Get a human-readable summary of validation issues
 */
export function getValidationSummary(result: TemplateValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return `✅ Template is graduation-ready (${result.metrics.totalCredits} credits)`;
  }
  
  const errors = result.issues.filter(i => i.type === 'error');
  const warnings = result.issues.filter(i => i.type === 'warning');
  
  const parts: string[] = [];
  if (errors.length > 0) parts.push(`❌ ${errors.length} error(s)`);
  if (warnings.length > 0) parts.push(`⚠️ ${warnings.length} warning(s)`);
  
  return parts.join(', ') + `: ${result.metrics.totalCredits}/120 credits`;
}

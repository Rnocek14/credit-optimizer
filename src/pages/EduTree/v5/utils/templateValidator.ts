/**
 * Template Validator - Ensures marketplace templates lead to graduation
 * 
 * Validates:
 * 1. Total credits = 120
 * 2. Residency requirements met per anchor school policy
 * 3. Upper-division requirements met
 * 4. Each module has sufficient course options to fill creditsRequired
 * 5. ALL courses have verified transfer rules (via templateTransferValidator)
 */

import { validateTemplateTransferability, TemplateTransferValidationResult } from './templateTransferValidator';

export interface PolicyRequirements {
  residencyCredits: number;
  upperDivisionCredits: number;
  transferCapCredits: number;
  totalCredits: number;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  details?: {
    expected: number;
    actual: number;
    shortfall?: number;
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
  };
  transferValidation?: TemplateTransferValidationResult;
}

// Anchor school policies
const ANCHOR_POLICIES: Record<string, PolicyRequirements> = {
  'TESU': { residencyCredits: 15, upperDivisionCredits: 30, transferCapCredits: 80, totalCredits: 120 },
  'WGU': { residencyCredits: 42, upperDivisionCredits: 0, transferCapCredits: 78, totalCredits: 120 },
  'UMGC': { residencyCredits: 30, upperDivisionCredits: 15, transferCapCredits: 90, totalCredits: 120 },
  'SNHU': { residencyCredits: 30, upperDivisionCredits: 30, transferCapCredits: 90, totalCredits: 120 },
};

/**
 * Parse credits from label like "Humanities (6cr)" -> 6
 */
export function parseCreditsFromLabel(label?: string): number {
  if (!label) return 3;
  const match = label.match(/\((\d+)cr\)/);
  return match ? parseInt(match[1], 10) : 3;
}

/**
 * Validates a marketplace template for graduation requirements
 */
export function validateTemplate(template: any): TemplateValidationResult {
  const issues: ValidationIssue[] = [];
  const anchorSchool = template.anchorSchool || 'TESU';
  const policy = ANCHOR_POLICIES[anchorSchool] || ANCHOR_POLICIES['TESU'];
  
  // Calculate metrics by analyzing all modules and their options
  let totalCredits = 0;
  let universityCredits = 0;
  let upperDivCredits = 0;
  let moocCredits = 0;
  let moduleCount = 0;
  let filledModules = 0;
  const unfilledModules: string[] = [];
  
  for (const yearTemplate of template.yearTemplates || []) {
    for (const moduleTemplate of yearTemplate.moduleTemplates || []) {
      moduleCount++;
      
      const { options, creditsRequired, label, moduleId } = moduleTemplate;
      
      // Determine target credits for this module
      const targetCredits = creditsRequired ?? parseCreditsFromLabel(label);
      
      // Calculate total credits available from all options
      const totalAvailableCredits = (options || []).reduce(
        (sum: number, opt: any) => sum + (opt.credits || 0), 
        0
      );
      
      // Check if module can be filled
      if (totalAvailableCredits >= targetCredits) {
        filledModules++;
        totalCredits += targetCredits;
        
        // Count credits by provider type (simulating selection of best options)
        let creditsNeeded = targetCredits;
        const sortedOptions = [...(options || [])].sort(
          (a: any, b: any) => (b.cri_score ?? 0) - (a.cri_score ?? 0)
        );
        
        for (const opt of sortedOptions) {
          if (creditsNeeded <= 0) break;
          const creditsFromOption = Math.min(opt.credits, creditsNeeded);
          creditsNeeded -= creditsFromOption;
          
          if (opt.providerType === 'university') {
            universityCredits += creditsFromOption;
            if ((opt.level || 0) >= 300) {
              upperDivCredits += creditsFromOption;
            }
          } else if (opt.providerType === 'mooc' || opt.providerType === 'testing_center') {
            moocCredits += creditsFromOption;
            if ((opt.level || 0) >= 300) {
              upperDivCredits += creditsFromOption;
            }
          }
        }
      } else {
        unfilledModules.push(moduleId);
        // Still count what we can get
        totalCredits += totalAvailableCredits;
        
        // Count available credits by type
        for (const opt of options || []) {
          if (opt.providerType === 'university') {
            universityCredits += opt.credits;
            if ((opt.level || 0) >= 300) {
              upperDivCredits += opt.credits;
            }
          } else {
            moocCredits += opt.credits;
            if ((opt.level || 0) >= 300) {
              upperDivCredits += opt.credits;
            }
          }
        }
      }
    }
  }
  
  // Issue: Total credits shortfall
  if (totalCredits < policy.totalCredits) {
    issues.push({
      type: 'error',
      code: 'CREDIT_SHORTFALL',
      message: `Template only provides ${totalCredits} credits, need ${policy.totalCredits}`,
      details: {
        expected: policy.totalCredits,
        actual: totalCredits,
        shortfall: policy.totalCredits - totalCredits,
      },
    });
  }
  
  // Issue: Residency requirement not met
  if (universityCredits < policy.residencyCredits) {
    issues.push({
      type: 'error',
      code: 'RESIDENCY_SHORTFALL',
      message: `Only ${universityCredits} university credits, need ${policy.residencyCredits} for ${anchorSchool} residency`,
      details: {
        expected: policy.residencyCredits,
        actual: universityCredits,
        shortfall: policy.residencyCredits - universityCredits,
      },
    });
  }
  
  // Issue: Upper-division requirement not met
  if (policy.upperDivisionCredits > 0 && upperDivCredits < policy.upperDivisionCredits) {
    issues.push({
      type: 'warning',
      code: 'UPPER_DIV_SHORTFALL',
      message: `Only ${upperDivCredits} upper-division credits, need ${policy.upperDivisionCredits}`,
      details: {
        expected: policy.upperDivisionCredits,
        actual: upperDivCredits,
        shortfall: policy.upperDivisionCredits - upperDivCredits,
      },
    });
  }
  
  // Issue: Unfilled modules
  if (unfilledModules.length > 0) {
    issues.push({
      type: 'warning',
      code: 'UNFILLED_MODULES',
      message: `${unfilledModules.length} module(s) don't have enough course options: ${unfilledModules.join(', ')}`,
      details: {
        expected: 0,
        actual: unfilledModules.length,
      },
    });
  }
  
  return {
    valid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    metrics: {
      totalCredits,
      universityCredits,
      upperDivCredits,
      moocCredits,
      moduleCount,
      filledModules,
      unfilledModules,
    },
  };
}

/**
 * Full validation including async transfer rule verification
 * This is the COMPLETE validation for decentralized degrees
 */
export async function validateTemplateWithTransfers(template: any): Promise<TemplateValidationResult> {
  // First run synchronous credit/policy validation
  const baseResult = validateTemplate(template);
  
  // Then run async transfer validation
  const transferResult = await validateTemplateTransferability(template);
  
  // Add transfer issues to the result
  if (!transferResult.valid) {
    baseResult.issues.push({
      type: 'error',
      code: 'UNVERIFIED_TRANSFERS',
      message: `${transferResult.unverifiedCourses} course(s) have no verified transfer rule to ${transferResult.anchorSchool}`,
      details: {
        expected: 0,
        actual: transferResult.unverifiedCourses,
      },
    });
    baseResult.valid = false;
  }
  
  if (transferResult.electiveOnlyCourses > 0) {
    baseResult.issues.push({
      type: 'warning',
      code: 'ELECTIVE_ONLY_TRANSFERS',
      message: `${transferResult.electiveOnlyCourses} course(s) transfer as elective credit only`,
      details: {
        expected: 0,
        actual: transferResult.electiveOnlyCourses,
      },
    });
  }
  
  return {
    ...baseResult,
    transferValidation: transferResult,
  };
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
  if (errors.length > 0) {
    parts.push(`❌ ${errors.length} error(s)`);
  }
  if (warnings.length > 0) {
    parts.push(`⚠️ ${warnings.length} warning(s)`);
  }
  
  return parts.join(', ') + `: ${result.metrics.totalCredits}/120 credits`;
}

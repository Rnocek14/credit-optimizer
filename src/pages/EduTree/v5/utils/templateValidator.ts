/**
 * Template Validator - Ensures marketplace templates lead to graduation
 * 
 * Validates:
 * 1. Total credits = 120
 * 2. Residency requirements met per anchor school policy
 * 3. Upper-division requirements met (30 credits at 300/400 level)
 * 4. Per-provider caps (SOPHIA 90, CLEP 40, DSST 30, STUDY_COM 30)
 * 5. Gen-ed category completeness
 * 6. Each module has sufficient course options to fill creditsRequired
 * 7. ALL courses have verified transfer rules (via templateTransferValidator)
 */

import { validateTemplateTransferability, TemplateTransferValidationResult } from './templateTransferValidator';

export interface PolicyRequirements {
  residencyCredits: number;
  upperDivisionCredits: number;
  transferCapCredits: number;
  totalCredits: number;
}

// Per-provider credit caps (TESU-specific)
export interface ProviderCaps {
  SOPHIA: number;
  STUDYCOM: number;
  CLEP: number;
  DSST: number;
}

// Gen-ed category requirements (TESU FW30)
export interface GenEdRequirements {
  WRITTEN_COMM: number;
  ORAL_COMM: number;
  QUANTITATIVE: number;
  HUMANITIES: number;
  SOCIAL_SCIENCE: number;
  NATURAL_SCIENCE: number;
  CIVIC_GLOBAL: number;
}

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
    // Per-provider breakdown
    creditsByProvider: Record<string, number>;
    // Gen-ed breakdown
    genedCreditsByCategory: Record<string, number>;
  };
  transferValidation?: TemplateTransferValidationResult;
}

// Anchor school policies
const ANCHOR_POLICIES: Record<string, PolicyRequirements> = {
  'TESU': { residencyCredits: 15, upperDivisionCredits: 30, transferCapCredits: 113, totalCredits: 120 },
  'WGU': { residencyCredits: 42, upperDivisionCredits: 0, transferCapCredits: 78, totalCredits: 120 },
  'UMGC': { residencyCredits: 30, upperDivisionCredits: 15, transferCapCredits: 90, totalCredits: 120 },
  'SNHU': { residencyCredits: 30, upperDivisionCredits: 30, transferCapCredits: 90, totalCredits: 120 },
};

// Provider caps (TESU-specific - other schools may differ)
const PROVIDER_CAPS: Record<string, ProviderCaps> = {
  'TESU': { SOPHIA: 90, STUDYCOM: 30, CLEP: 40, DSST: 30 },
  'WGU': { SOPHIA: 0, STUDYCOM: 0, CLEP: 45, DSST: 30 }, // WGU accepts limited testing
  'UMGC': { SOPHIA: 60, STUDYCOM: 30, CLEP: 60, DSST: 60 },
  'SNHU': { SOPHIA: 45, STUDYCOM: 30, CLEP: 60, DSST: 60 },
};

// Gen-Ed requirements (TESU FW30)
const GENED_REQUIREMENTS: Record<string, GenEdRequirements> = {
  'TESU': {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 3,
    HUMANITIES: 9,
    SOCIAL_SCIENCE: 9,
    NATURAL_SCIENCE: 6,
    CIVIC_GLOBAL: 3,
  },
  'WGU': {
    WRITTEN_COMM: 6,
    ORAL_COMM: 0, // WGU doesn't require separate oral comm
    QUANTITATIVE: 3,
    HUMANITIES: 6,
    SOCIAL_SCIENCE: 6,
    NATURAL_SCIENCE: 4,
    CIVIC_GLOBAL: 0,
  },
  'UMGC': {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 3,
    HUMANITIES: 6,
    SOCIAL_SCIENCE: 6,
    NATURAL_SCIENCE: 7,
    CIVIC_GLOBAL: 0,
  },
  'SNHU': {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 6,
    HUMANITIES: 6,
    SOCIAL_SCIENCE: 6,
    NATURAL_SCIENCE: 6,
    CIVIC_GLOBAL: 3,
  },
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
    'GEN_ED': null, // Generic gen-ed doesn't map to specific category
  };
  return requirementArea ? (mapping[requirementArea] ?? null) : null;
}

/**
 * Validates a marketplace template for graduation requirements
 * Enhanced with provider caps and gen-ed validation
 */
export function validateTemplate(template: any): TemplateValidationResult {
  const issues: ValidationIssue[] = [];
  const anchorSchool = template.anchorSchool || 'TESU';
  const policy = ANCHOR_POLICIES[anchorSchool] || ANCHOR_POLICIES['TESU'];
  const providerCaps = PROVIDER_CAPS[anchorSchool] || PROVIDER_CAPS['TESU'];
  const genEdReqs = GENED_REQUIREMENTS[anchorSchool] || GENED_REQUIREMENTS['TESU'];
  
  // Calculate metrics by analyzing all modules and their options
  let totalCredits = 0;
  let universityCredits = 0;
  let upperDivCredits = 0;
  let moocCredits = 0;
  let moduleCount = 0;
  let filledModules = 0;
  const unfilledModules: string[] = [];
  
  // Track per-provider credits
  const creditsByProvider: Record<string, number> = {};
  
  // Track gen-ed credits by category
  const genedCreditsByCategory: Record<string, number> = {};
  
  for (const yearTemplate of template.yearTemplates || []) {
    for (const moduleTemplate of yearTemplate.moduleTemplates || []) {
      moduleCount++;
      
      const { options, creditsRequired, label, moduleId, requirementArea } = moduleTemplate;
      
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
          
          // Track provider credits
          const providerCode = opt.providerCode || 'UNKNOWN';
          creditsByProvider[providerCode] = (creditsByProvider[providerCode] || 0) + creditsFromOption;
          
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
        
        // Track gen-ed category credits
        const genEdCategory = mapToGenEdCategory(requirementArea);
        if (genEdCategory) {
          genedCreditsByCategory[genEdCategory] = (genedCreditsByCategory[genEdCategory] || 0) + targetCredits;
        }
      } else {
        unfilledModules.push(moduleId);
        // Still count what we can get
        totalCredits += totalAvailableCredits;
        
        // Count available credits by type
        for (const opt of options || []) {
          const providerCode = opt.providerCode || 'UNKNOWN';
          creditsByProvider[providerCode] = (creditsByProvider[providerCode] || 0) + opt.credits;
          
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
        
        // Track gen-ed even for unfilled
        const genEdCategory = mapToGenEdCategory(requirementArea);
        if (genEdCategory) {
          genedCreditsByCategory[genEdCategory] = (genedCreditsByCategory[genEdCategory] || 0) + totalAvailableCredits;
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
      type: 'error',
      code: 'UPPER_DIV_SHORTFALL',
      message: `Only ${upperDivCredits} upper-division credits, need ${policy.upperDivisionCredits}`,
      details: {
        expected: policy.upperDivisionCredits,
        actual: upperDivCredits,
        shortfall: policy.upperDivisionCredits - upperDivCredits,
      },
    });
  }
  
  // Issue: Per-provider cap violations
  const providerCapChecks: Array<{ code: string; cap: number }> = [
    { code: 'SOPHIA', cap: providerCaps.SOPHIA },
    { code: 'STUDYCOM', cap: providerCaps.STUDYCOM },
    { code: 'CLEP', cap: providerCaps.CLEP },
    { code: 'DSST', cap: providerCaps.DSST },
  ];
  
  for (const { code, cap } of providerCapChecks) {
    const credits = creditsByProvider[code] || 0;
    if (cap > 0 && credits > cap) {
      issues.push({
        type: 'error',
        code: 'PROVIDER_CAP_EXCEEDED',
        message: `${code} credits (${credits}) exceed ${cap}-credit cap`,
        details: {
          expected: cap,
          actual: credits,
          shortfall: credits - cap,
          provider: code,
        },
      });
    }
  }
  
  // Issue: Gen-ed category completeness
  for (const [category, required] of Object.entries(genEdReqs)) {
    if (required === 0) continue; // Skip categories not required for this school
    const earned = genedCreditsByCategory[category] || 0;
    if (earned < required) {
      issues.push({
        type: 'warning',
        code: 'GENED_INCOMPLETE',
        message: `${category}: Only ${earned}/${required} credits`,
        details: {
          expected: required,
          actual: earned,
          shortfall: required - earned,
          category,
        },
      });
    }
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
  
  // Determine if valid (no errors, but warnings allowed)
  const hasErrors = issues.filter(i => i.type === 'error').length > 0;
  
  return {
    valid: !hasErrors,
    issues,
    metrics: {
      totalCredits,
      universityCredits,
      upperDivCredits,
      moocCredits,
      moduleCount,
      filledModules,
      unfilledModules,
      creditsByProvider,
      genedCreditsByCategory,
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

/**
 * Template Buildability Scanner (Phase A.6)
 * 
 * Validates that JSON fixture templates can actually build complete degrees
 * by running synthetic tests against the real assembly path.
 * 
 * Tests:
 * 1. clean_transfer - Standard transcript, should pass
 * 2. over_transfer_cap - Exceeds max transfer, should show violations
 * 3. over_alt_cap - Exceeds alt credit cap, should show violations  
 * 4. capstone_substitution - Attempt capstone with non-resident credit, must FAIL
 */

import type { MarketplaceDegreeTemplate } from '../types/templates';
import type { Constraints, BasketItem, MarketplaceOption } from '../types/exports';
import { applyTemplate } from './applyTemplate';
import { validatePlan, type Violation } from './constraints';
import { isAltCredit, isTransferCredit } from '../utils/creditClassification';

// Import fixture templates
import marketplaceV2Templates from '@/fixtures/templates/marketplace-v2-templates.json';

export type ScanTestType = 
  | 'clean_transfer' 
  | 'over_transfer_cap' 
  | 'over_alt_cap' 
  | 'capstone_substitution';

export interface ScanTestResult {
  testType: ScanTestType;
  passed: boolean;
  expectedPass: boolean;
  details: {
    totalCredits: number;
    transferCredits: number;
    altCredits: number;
    residentCredits: number;
    violationCount: number;
    violations: string[];
    capstoneSatisfied: boolean;
    capstoneBlocked: boolean;
  };
  errors: string[];
}

export interface TemplateScanResult {
  templateId: string;
  institution: string;
  programId: string;
  optimization: string;
  tests: ScanTestResult[];
  overallPass: boolean;
  summary: string;
}

export interface ScanReport {
  timestamp: string;
  templatesScanned: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TemplateScanResult[];
  summaryTable: Array<{
    institution: string;
    templateId: string;
    clean_transfer: 'PASS' | 'FAIL';
    over_transfer_cap: 'PASS' | 'FAIL';
    over_alt_cap: 'PASS' | 'FAIL';
    capstone_substitution: 'PASS' | 'FAIL';
    topFailure?: string;
  }>;
}

interface ModuleTemplate {
  moduleId?: string;
  requirementArea?: string;
  options?: MarketplaceOption[];
  recommendedCourseId?: string;
}

interface YearTemplate {
  year?: number;
  moduleTemplates?: ModuleTemplate[];
}

/**
 * Extract all options from a template's year/module structure
 */
function extractOptionsFromTemplate(template: MarketplaceDegreeTemplate): MarketplaceOption[] {
  const options: MarketplaceOption[] = [];
  
  const yearTemplates = (template as any).yearTemplates as YearTemplate[] | undefined;
  
  for (const year of yearTemplates || []) {
    for (const module of year.moduleTemplates || []) {
      for (const opt of module.options || []) {
        options.push({
          ...opt,
          moduleId: module.moduleId,
          requirementArea: module.requirementArea,
        } as MarketplaceOption);
      }
    }
  }
  
  return options;
}

/**
 * Build constraints from template's anchor school
 */
function buildConstraintsForTemplate(
  template: MarketplaceDegreeTemplate,
  policyData: Record<string, any>
): Constraints {
  return {
    target_school: template.anchorSchool,
    max_budget_usd: 50000, // Generous limit for testing
    max_ace_credits: policyData.max_alt_credit ?? 90,
  };
}

/**
 * Run a single test scenario
 */
function runTest(
  testType: ScanTestType,
  template: MarketplaceDegreeTemplate,
  options: MarketplaceOption[],
  policyData: Record<string, any>
): ScanTestResult {
  const constraints = buildConstraintsForTemplate(template, policyData);
  const institutionCode = template.anchorSchool;
  const errors: string[] = [];
  
  let basket: BasketItem[] = [];
  let applyConflicts: Array<{ reason: string }> = [];
  let violations: Violation[] = [];
  
  try {
    // Build basket based on test type
    switch (testType) {
      case 'clean_transfer': {
        // Standard application of template
        const result = applyTemplate({
          scope: 'degree',
          templateId: template.id,
          options: options,
          currentBasket: [],
          constraints,
          allOptions: options,
        });
        basket = result.added;
        applyConflicts = result.conflicts;
        break;
      }
      
      case 'over_transfer_cap': {
        // Add extra transfer credits to exceed cap
        const result = applyTemplate({
          scope: 'degree',
          templateId: template.id,
          options: options,
          currentBasket: [],
          constraints,
          allOptions: options,
        });
        basket = result.added;
        applyConflicts = result.conflicts;
        
        // Add synthetic over-cap items
        const syntheticTransfer: BasketItem = {
          moduleId: 'SYNTHETIC_TRANSFER',
          courseId: 'SYNTH-TRANSFER-EXCESS',
          title: 'Synthetic Transfer Excess',
          credits: 30,
          cost_usd: 0,
          duration_weeks: 0,
          workload_weekly_hours: 0,
          cri_score: 50,
          status: 'auto-filled',
          providerType: 'university',
        };
        basket.push(syntheticTransfer);
        break;
      }
      
      case 'over_alt_cap': {
        // Add extra alt credits to exceed cap
        const result = applyTemplate({
          scope: 'degree',
          templateId: template.id,
          options: options,
          currentBasket: [],
          constraints,
          allOptions: options,
        });
        basket = result.added;
        applyConflicts = result.conflicts;
        
        // Add synthetic over-cap alt credit
        const syntheticAlt: BasketItem = {
          moduleId: 'SYNTHETIC_ALT',
          courseId: 'SYNTH-ALT-EXCESS',
          title: 'Synthetic Alt Credit Excess',
          credits: 30,
          cost_usd: 99,
          duration_weeks: 4,
          workload_weekly_hours: 8,
          cri_score: 50,
          status: 'auto-filled',
          providerType: 'mooc',
        };
        basket.push(syntheticAlt);
        break;
      }
      
      case 'capstone_substitution': {
        // Try to satisfy capstone with non-institutional credit
        // Create modified options with forced non-institutional capstone
        const modifiedOptions = options.map(opt => {
          const isCapstone = (opt as any).requirementArea === 'CAPSTONE' ||
                            opt.title?.toLowerCase().includes('capstone');
          if (isCapstone) {
            return {
              ...opt,
              providerType: 'mooc' as const,
            };
          }
          return opt;
        });
        
        const result = applyTemplate({
          scope: 'degree',
          templateId: template.id,
          options: modifiedOptions,
          currentBasket: [],
          constraints,
          allOptions: modifiedOptions,
        });
        basket = result.added;
        applyConflicts = result.conflicts;
        break;
      }
    }
    
    // Run constraint validation
    violations = validatePlan(basket, options, constraints);
    
    // Calculate totals
    let totalCredits = 0;
    let transferCredits = 0;
    let altCredits = 0;
    let residentCredits = 0;
    
    for (const item of basket) {
      totalCredits += item.credits;
      
      const classifiableItem = {
        providerType: item.providerType,
        providerCode: (item as any).providerCode,
        isAltCredit: (item as any).isAltCredit,
        aceNccrs: (item as any).aceNccrs,
        credits: item.credits,
      };
      
      if (isTransferCredit(classifiableItem, institutionCode)) {
        transferCredits += item.credits;
      } else {
        residentCredits += item.credits;
      }
      
      if (isAltCredit(classifiableItem)) {
        altCredits += item.credits;
      }
    }
    
    // Check for capstone blocking
    const capstoneBlocked = applyConflicts.some(c => 
      c.reason.includes('BLOCKED') && c.reason.toLowerCase().includes('capstone')
    );
    
    // Check if capstone is satisfied with resident credits
    const capstoneSatisfied = basket.some(item => 
      ((item as any).requirementArea === 'CAPSTONE' || 
       item.title?.toLowerCase().includes('capstone')) &&
      item.providerType === 'university'
    );
    
    // Determine expected vs actual
    let passed = true;
    
    switch (testType) {
      case 'clean_transfer':
        // Should pass with no errors
        passed = violations.filter(v => v.severity === 'error').length === 0;
        break;
        
      case 'over_transfer_cap':
        // Should correctly detect over-cap (test passes if violation detected)
        passed = violations.some(v => v.type === 'transfer_cap' || v.type === 'total_transfer');
        break;
        
      case 'over_alt_cap':
        // Should correctly detect over-cap (test passes if violation detected)
        passed = violations.some(v => v.type === 'transfer_cap' || v.type === 'provider_cap');
        break;
        
      case 'capstone_substitution':
        // MUST be blocked (test passes if capstone was blocked)
        passed = capstoneBlocked;
        break;
    }
    
    return {
      testType,
      passed,
      expectedPass: testType === 'clean_transfer',
      details: {
        totalCredits,
        transferCredits,
        altCredits,
        residentCredits,
        violationCount: violations.length,
        violations: violations.map(v => `${v.type}: ${v.message}`),
        capstoneSatisfied,
        capstoneBlocked,
      },
      errors,
    };
    
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      testType,
      passed: false,
      expectedPass: testType === 'clean_transfer',
      details: {
        totalCredits: 0,
        transferCredits: 0,
        altCredits: 0,
        residentCredits: 0,
        violationCount: 0,
        violations: [],
        capstoneSatisfied: false,
        capstoneBlocked: false,
      },
      errors,
    };
  }
}

/**
 * Scan a single template
 */
function scanTemplate(
  template: MarketplaceDegreeTemplate,
  policyData: Record<string, any>
): TemplateScanResult {
  const options = extractOptionsFromTemplate(template);
  
  const tests: ScanTestResult[] = [
    runTest('clean_transfer', template, options, policyData),
    runTest('over_transfer_cap', template, options, policyData),
    runTest('over_alt_cap', template, options, policyData),
    runTest('capstone_substitution', template, options, policyData),
  ];
  
  const overallPass = tests.every(t => t.passed);
  const failedTests = tests.filter(t => !t.passed);
  
  return {
    templateId: template.id,
    institution: template.anchorSchool,
    programId: template.programId,
    optimization: template.optimization || 'standard',
    tests,
    overallPass,
    summary: overallPass 
      ? 'All tests passed' 
      : `Failed: ${failedTests.map(t => t.testType).join(', ')}`,
  };
}

/**
 * Get mock policy data for testing (would normally come from DB)
 */
function getMockPolicyData(institutionCode: string): Record<string, any> {
  const policies: Record<string, Record<string, any>> = {
    TESU: {
      degree_credit_total: 120,
      residency_credits: 15,
      max_transfer_credits: 105,
      max_alt_credit: 90,
      capstone_in_residence: true,
      grade_rules: { min_transfer_grade: 'C' },
    },
    COSC: {
      degree_credit_total: 120,
      residency_credits: 6,
      max_transfer_credits: 114,
      max_alt_credit: 90,
      capstone_in_residence: true,
      grade_rules: { min_transfer_grade: 'C' },
    },
    SNHU: {
      degree_credit_total: 120,
      residency_credits: 30,
      max_transfer_credits: 90,
      max_alt_credit: 60,
      capstone_in_residence: true,
      grade_rules: { min_transfer_grade: 'C' },
    },
    WGU: {
      degree_credit_total: 120,
      residency_credits: 24,
      max_transfer_credits: 90,
      max_alt_credit: 45,
      capstone_in_residence: true,
      grade_rules: { min_transfer_grade: 'C' },
    },
  };
  
  return policies[institutionCode] ?? {
    degree_credit_total: 120,
    residency_credits: 30,
    max_transfer_credits: 90,
    max_alt_credit: 60,
    capstone_in_residence: true,
    grade_rules: { min_transfer_grade: 'C' },
  };
}

/**
 * Run the full buildability scan on all fixture templates
 */
export function runBuildabilityScan(): ScanReport {
  // Cast with unknown to avoid strict type checking on fixture structure
  const templates = (marketplaceV2Templates as unknown) as MarketplaceDegreeTemplate[];
  const results: TemplateScanResult[] = [];
  
  console.log('[BuildabilityScan] Starting scan of %d templates', templates.length);
  
  for (const template of templates) {
    const policyData = getMockPolicyData(template.anchorSchool);
    const result = scanTemplate(template, policyData);
    results.push(result);
    
    console.log('[BuildabilityScan] %s: %s', 
      template.id, 
      result.overallPass ? '✅ PASS' : `❌ FAIL (${result.summary})`
    );
  }
  
  // Build summary table
  const summaryTable = results.map(r => {
    const getStatus = (testType: ScanTestType): 'PASS' | 'FAIL' => {
      const test = r.tests.find(t => t.testType === testType);
      return test?.passed ? 'PASS' : 'FAIL';
    };
    
    const failedTest = r.tests.find(t => !t.passed);
    
    return {
      institution: r.institution,
      templateId: r.templateId,
      clean_transfer: getStatus('clean_transfer'),
      over_transfer_cap: getStatus('over_transfer_cap'),
      over_alt_cap: getStatus('over_alt_cap'),
      capstone_substitution: getStatus('capstone_substitution'),
      topFailure: failedTest ? `${failedTest.testType}: ${failedTest.errors[0] || failedTest.details.violations[0] || 'unknown'}` : undefined,
    };
  });
  
  const totalTests = results.length * 4;
  const passedTests = results.reduce((sum, r) => sum + r.tests.filter(t => t.passed).length, 0);
  
  return {
    timestamp: new Date().toISOString(),
    templatesScanned: templates.length,
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    results,
    summaryTable,
  };
}

/**
 * Format scan report as console-friendly table
 */
export function formatScanReport(report: ScanReport): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════════════',
    '                    TEMPLATE BUILDABILITY SCAN REPORT',
    '═══════════════════════════════════════════════════════════════════════════',
    `Timestamp: ${report.timestamp}`,
    `Templates: ${report.templatesScanned}`,
    `Tests: ${report.passedTests}/${report.totalTests} passed (${Math.round(report.passedTests / report.totalTests * 100)}%)`,
    '',
    'SUMMARY TABLE:',
    '───────────────────────────────────────────────────────────────────────────',
    'Institution │ Template ID                         │ Clean │ OvrTr │ OvrAlt │ Cap  ',
    '───────────────────────────────────────────────────────────────────────────',
  ];
  
  for (const row of report.summaryTable) {
    const inst = row.institution.padEnd(11);
    const tmpl = row.templateId.substring(0, 35).padEnd(35);
    const clean = row.clean_transfer === 'PASS' ? '  ✅ ' : '  ❌ ';
    const ovrTr = row.over_transfer_cap === 'PASS' ? '  ✅ ' : '  ❌ ';
    const ovrAlt = row.over_alt_cap === 'PASS' ? '  ✅ ' : '  ❌ ';
    const cap = row.capstone_substitution === 'PASS' ? '  ✅ ' : '  ❌ ';
    
    lines.push(`${inst} │ ${tmpl} │${clean}│${ovrTr}│${ovrAlt}│${cap}`);
    
    if (row.topFailure) {
      lines.push(`            │ └─ ${row.topFailure.substring(0, 50)}`);
    }
  }
  
  lines.push('═══════════════════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

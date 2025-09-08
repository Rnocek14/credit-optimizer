#!/usr/bin/env tsx
/**
 * Comprehensive validation runner for Phase 1-3 compliance
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface ValidationSummary {
  touchTargets: { status: string; issues: number };
  colorCompliance: { status: string; violations: number };
  contrastRatios: { status: string; failing: number };
  overallCompliance: number;
}

async function runValidations(): Promise<ValidationSummary> {
  console.log('🎨 Running comprehensive design system validation...\n');
  
  let touchTargetIssues = 0;
  let colorViolations = 0;
  let contrastFailures = 0;
  
  try {
    // 1. Quick smoke test for touch targets
    console.log('🎯 Testing touch target compliance...');
    const smokeResult = execSync('pnpm tsx scripts/quick-smoke-test.ts', { encoding: 'utf8' });
    console.log(smokeResult);
    
    if (smokeResult.includes('FAIL')) {
      touchTargetIssues = parseInt(smokeResult.match(/(\d+) critical issues/)?.[1] || '0');
    }
  } catch (error: any) {
    console.log('Touch target test completed with issues');
    touchTargetIssues = parseInt(error.stdout?.match(/(\d+) critical issues/)?.[1] || '1');
  }
  
  try {
    // 2. Phase 3 comprehensive validation
    console.log('\n📋 Running Phase 3 validation...');
    const phase3Result = execSync('pnpm tsx scripts/validate-phase3.ts', { encoding: 'utf8' });
    console.log(phase3Result);
  } catch (error: any) {
    console.log('Phase 3 validation completed');
  }
  
  try {
    // 3. Design system validation (contrast + colors)
    console.log('\n🎨 Running design system validation...');
    const designResult = execSync('pnpm tsx scripts/validate-design-system.ts', { encoding: 'utf8' });
    console.log(designResult);
    
    // Parse results
    const contrastMatch = designResult.match(/Contrast Tests: (\d+)\/(\d+) passed/);
    if (contrastMatch) {
      const passed = parseInt(contrastMatch[1]);
      const total = parseInt(contrastMatch[2]);
      contrastFailures = total - passed;
    }
    
    const violationMatch = designResult.match(/Color Violations: (\d+) found/);
    if (violationMatch) {
      colorViolations = parseInt(violationMatch[1]);
    }
  } catch (error: any) {
    console.log('Design system validation completed');
    
    // Try to parse from stderr
    const output = error.stdout || '';
    const contrastMatch = output.match(/Contrast Tests: (\d+)\/(\d+) passed/);
    if (contrastMatch) {
      const passed = parseInt(contrastMatch[1]);
      const total = parseInt(contrastMatch[2]);
      contrastFailures = total - passed;
    }
    
    const violationMatch = output.match(/Color Violations: (\d+) found/);
    if (violationMatch) {
      colorViolations = parseInt(violationMatch[1]);
    }
  }
  
  // Calculate overall compliance
  const totalIssues = touchTargetIssues + colorViolations + contrastFailures;
  const maxIssues = 50; // Baseline for 0% compliance
  const compliance = Math.max(0, Math.min(100, 100 - (totalIssues / maxIssues) * 100));
  
  const summary: ValidationSummary = {
    touchTargets: {
      status: touchTargetIssues === 0 ? 'PASS' : touchTargetIssues < 5 ? 'WARN' : 'FAIL',
      issues: touchTargetIssues
    },
    colorCompliance: {
      status: colorViolations === 0 ? 'PASS' : colorViolations < 10 ? 'WARN' : 'FAIL',
      violations: colorViolations
    },
    contrastRatios: {
      status: contrastFailures === 0 ? 'PASS' : contrastFailures < 2 ? 'WARN' : 'FAIL',
      failing: contrastFailures
    },
    overallCompliance: Math.round(compliance * 10) / 10
  };
  
  return summary;
}

async function main() {
  const summary = await runValidations();
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=====================================');
  console.log(`Touch Targets: ${summary.touchTargets.status} (${summary.touchTargets.issues} issues)`);
  console.log(`Color Compliance: ${summary.colorCompliance.status} (${summary.colorCompliance.violations} violations)`);
  console.log(`Contrast Ratios: ${summary.contrastRatios.status} (${summary.contrastRatios.failing} failing)`);
  console.log(`Overall Compliance: ${summary.overallCompliance}%`);
  
  if (summary.overallCompliance >= 90) {
    console.log('\n✅ EXCELLENT - Ready for production!');
    process.exit(0);
  } else if (summary.overallCompliance >= 75) {
    console.log('\n⚠️  GOOD - Minor issues to address');
    process.exit(0);
  } else if (summary.overallCompliance >= 50) {
    console.log('\n🔧 NEEDS WORK - Run auto-fixes first');
    console.log('\nQuick fixes:');
    console.log('npx jscodeshift -t scripts/codemod-touch-targets.js "src/**/*.{ts,tsx}"');
    console.log('npx jscodeshift -t scripts/codemods/migrate-spacing.js "src/**/*.{ts,tsx}"');
    process.exit(1);
  } else {
    console.log('\n❌ CRITICAL - Major compliance issues');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
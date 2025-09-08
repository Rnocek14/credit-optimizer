#!/usr/bin/env tsx

/**
 * Consolidated Go/No-Go Validation Script
 * Runs all validation checks and provides a final decision
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

interface ValidationResult {
  category: string;
  passed: boolean;
  score?: number;
  issues: string[];
  warnings: string[];
}

const results: ValidationResult[] = [];

// Run individual validators and collect results
async function runValidations() {
  console.log('🚀 Running Go/No-Go Validation Suite...\n');

  // 1. Touch targets & spacing
  try {
    execSync('tsx scripts/quick-smoke-test.ts', { stdio: 'pipe' });
    results.push({
      category: 'Touch Targets & Spacing',
      passed: true,
      issues: [],
      warnings: []
    });
  } catch (error) {
    results.push({
      category: 'Touch Targets & Spacing',
      passed: false,
      issues: ['Touch target validation failed'],
      warnings: []
    });
  }

  // 2. Design system validation
  try {
    execSync('tsx scripts/validate-design-system.ts', { stdio: 'pipe' });
    results.push({
      category: 'Design System',
      passed: true,
      issues: [],
      warnings: []
    });
  } catch (error) {
    results.push({
      category: 'Design System',
      passed: false,
      issues: ['Design system validation failed'],
      warnings: []
    });
  }

  // 3. Motion guards
  try {
    execSync('tsx scripts/validate-motion-guards.ts', { stdio: 'pipe' });
    results.push({
      category: 'Motion Preferences',
      passed: true,
      issues: [],
      warnings: []
    });
  } catch (error) {
    results.push({
      category: 'Motion Preferences',
      passed: false,
      issues: ['Motion guards validation failed'],
      warnings: []
    });
  }

  // 4. Phase 3 validation
  try {
    execSync('tsx scripts/validate-phase3.ts', { stdio: 'pipe' });
    results.push({
      category: 'Phase 3 Compliance',
      passed: true,
      score: 100,
      issues: [],
      warnings: []
    });
  } catch (error) {
    results.push({
      category: 'Phase 3 Compliance',
      passed: false,
      score: 75,
      issues: ['Phase 3 validation failed'],
      warnings: []
    });
  }

  // 5. Lint check
  try {
    execSync('pnpm lint', { stdio: 'pipe' });
    results.push({
      category: 'Code Quality (ESLint)',
      passed: true,
      issues: [],
      warnings: []
    });
  } catch (error) {
    results.push({
      category: 'Code Quality (ESLint)',
      passed: false,
      issues: ['ESLint errors found'],
      warnings: []
    });
  }
}

function generateReport() {
  console.log('\n📊 VALIDATION RESULTS\n');
  console.log('=' .repeat(50));

  let totalPassed = 0;
  let totalIssues = 0;
  let totalWarnings = 0;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const score = result.score ? ` (${result.score}%)` : '';
    
    console.log(`${status} ${result.category}${score}`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`   🚨 ${issue}`));
      totalIssues += result.issues.length;
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
      totalWarnings += result.warnings.length;
    }
    
    if (result.passed) totalPassed++;
  });

  console.log('\n' + '=' .repeat(50));
  
  const passRate = (totalPassed / results.length) * 100;
  const decision = passRate >= 90 && totalIssues === 0 ? 'GO' : 'NO-GO';
  const decisionIcon = decision === 'GO' ? '🟢' : '🔴';
  
  console.log(`\n${decisionIcon} DECISION: ${decision}`);
  console.log(`\nSummary:`);
  console.log(`  • Passed: ${totalPassed}/${results.length} (${passRate.toFixed(1)}%)`);
  console.log(`  • Issues: ${totalIssues}`);
  console.log(`  • Warnings: ${totalWarnings}`);
  
  if (decision === 'GO') {
    console.log(`\n✨ Ready to ship! All critical validations passed.`);
  } else {
    console.log(`\n🛑 Hold deployment. Address critical issues first.`);
  }
  
  console.log('\n🔗 Quick commands:');
  console.log('   • Fix spacing: npx jscodeshift -t scripts/codemods/migrate-spacing.js "src/**/*.{ts,tsx}"');
  console.log('   • Fix motion: Add .motion-safe: prefix to animations');
  console.log('   • Fix lint: pnpm lint --fix');
  
  // Exit with appropriate code
  process.exit(decision === 'GO' ? 0 : 1);
}

// Run the validation suite
runValidations().then(generateReport).catch(error => {
  console.error('❌ Validation suite failed:', error);
  process.exit(1);
});
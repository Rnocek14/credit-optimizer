#!/usr/bin/env tsx
/**
 * Design System Validation Script
 * Validates OKLCH contrast ratios and generates compliance report
 */

import { generateContrastReport, validateDesignSystemContrast } from '../src/utils/contrastValidator';
import { validateNoHardcodedColors } from '../src/utils/colorMigration';
import { glob } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  contrastResults: ReturnType<typeof validateDesignSystemContrast>;
  codebaseViolations: Array<{
    file: string;
    violations: Array<{ match: string; line?: number; context?: string }>;
  }>;
  summary: {
    contrastPasses: number;
    contrastTotal: number;
    violationFiles: number;
    totalViolations: number;
  };
}

async function validateCodebase(): Promise<ValidationResult['codebaseViolations']> {
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
    ignore: ['node_modules/**', 'dist/**', '**/*.d.ts'] 
  });
  
  const violations: ValidationResult['codebaseViolations'] = [];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const result = validateNoHardcodedColors(content);
      
      if (!result.isValid) {
        violations.push({
          file,
          violations: result.violations
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error);
    }
  }
  
  return violations;
}

async function main() {
  console.log('🎨 Running Design System Validation...\n');
  
  // Validate contrast ratios
  console.log('⚡ Validating WCAG contrast ratios...');
  const contrastResults = validateDesignSystemContrast();
  const contrastPasses = contrastResults.filter(r => r.passes).length;
  
  // Validate codebase for hardcoded colors
  console.log('🔍 Scanning codebase for hardcoded colors...');
  const codebaseViolations = await validateCodebase();
  const totalViolations = codebaseViolations.reduce((sum, file) => sum + file.violations.length, 0);
  
  const results: ValidationResult = {
    contrastResults,
    codebaseViolations,
    summary: {
      contrastPasses,
      contrastTotal: contrastResults.length,
      violationFiles: codebaseViolations.length,
      totalViolations
    }
  };
  
  // Generate reports
  const contrastReport = generateContrastReport();
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Write contrast report
  writeFileSync(`reports/contrast-report-${timestamp}.md`, contrastReport);
  console.log(`✅ Contrast report saved to reports/contrast-report-${timestamp}.md`);
  
  // Generate codebase violations report
  let violationsReport = `# Codebase Color Violations Report\n\n`;
  violationsReport += `Generated: ${new Date().toISOString()}\n\n`;
  violationsReport += `## Summary\n`;
  violationsReport += `- Files with violations: ${results.summary.violationFiles}\n`;
  violationsReport += `- Total violations: ${results.summary.totalViolations}\n\n`;
  
  if (codebaseViolations.length > 0) {
    violationsReport += `## Violations by File\n\n`;
    codebaseViolations.forEach(({ file, violations }) => {
      violationsReport += `### ${file}\n\n`;
      violations.forEach(v => {
        violationsReport += `- Line ${v.line}: \`${v.match}\`\n`;
        if (v.context) {
          violationsReport += `  Context: \`${v.context}\`\n`;
        }
      });
      violationsReport += `\n`;
    });
  }
  
  writeFileSync(`reports/violations-report-${timestamp}.md`, violationsReport);
  console.log(`✅ Violations report saved to reports/violations-report-${timestamp}.md`);
  
  // Print summary
  console.log('\n📊 Validation Summary:');
  console.log(`Contrast Tests: ${contrastPasses}/${results.summary.contrastTotal} passed`);
  console.log(`Color Violations: ${totalViolations} found in ${results.summary.violationFiles} files`);
  
  // Exit codes for CI
  const hasContrastFailures = contrastPasses < results.summary.contrastTotal;
  const hasViolations = totalViolations > 0;
  
  if (hasContrastFailures || hasViolations) {
    console.log('\n❌ Validation failed - see reports for details');
    process.exit(1);
  } else {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  }
}

// Create reports directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('reports', { recursive: true });
} catch (error) {
  // Directory might already exist
}

main().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
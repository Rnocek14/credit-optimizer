#!/usr/bin/env tsx
/**
 * Quick Smoke Test - Touch Target Compliance Check
 * Rapid verification of critical touch target issues
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';

interface SmokeTestResult {
  criticalIssues: Array<{
    file: string;
    line: number;
    issue: string;
    context: string;
  }>;
  summary: {
    filesScanned: number;
    criticalIssues: number;
    status: 'PASS' | 'WARN' | 'FAIL';
  };
}

async function runSmokeTest(): Promise<SmokeTestResult> {
  const files = await glob('src/components/**/*.{ts,tsx}', {
    ignore: ['**/*.d.ts', '**/node_modules/**']
  });
  
  const criticalIssues: SmokeTestResult['criticalIssues'] = [];
  
  // Patterns for critical touch target violations
  const criticalPatterns = [
    {
      pattern: /Button.*className.*\b(h|min-h)-(8|9|10|11)\b/g,
      message: 'Button with undersized height'
    },
    {
      pattern: /onClick.*className.*\b(h|min-h)-(8|9|10|11)\b/g,
      message: 'Interactive element with undersized height'
    },
    {
      pattern: /"h-[89]\s|h-1[01]\s/g,
      message: 'Potentially undersized interactive element'
    }
  ];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      criticalPatterns.forEach(({ pattern, message }) => {
        lines.forEach((line, index) => {
          pattern.lastIndex = 0; // Reset regex
          if (pattern.test(line)) {
            // Check if this line contains interactive elements
            if (/Button|onClick|onPress|role=["']button["']/.test(line)) {
              criticalIssues.push({
                file: file.replace('src/', ''),
                line: index + 1,
                issue: message,
                context: line.trim().substring(0, 80) + '...'
              });
            }
          }
        });
      });
    } catch (error) {
      console.warn(`Warning: Could not read ${file}`);
    }
  }
  
  const status = criticalIssues.length === 0 ? 'PASS' : 
                criticalIssues.length <= 3 ? 'WARN' : 'FAIL';
  
  return {
    criticalIssues,
    summary: {
      filesScanned: files.length,
      criticalIssues: criticalIssues.length,
      status
    }
  };
}

async function main() {
  console.log('🔍 Running Touch Target Smoke Test...\n');
  
  const results = await runSmokeTest();
  
  console.log(`📊 Scanned ${results.summary.filesScanned} component files`);
  console.log(`🎯 Status: ${results.summary.status}`);
  console.log(`⚠️  Critical issues: ${results.summary.criticalIssues}\n`);
  
  if (results.criticalIssues.length > 0) {
    console.log('🚨 Critical Touch Target Issues:');
    results.criticalIssues.forEach(({ file, line, issue, context }) => {
      console.log(`  ${file}:${line} - ${issue}`);
      console.log(`    ${context}`);
    });
    console.log('\n💡 Fix: Replace h-8, h-9, h-10, h-11 with h-12 on interactive elements');
  } else {
    console.log('✅ No critical touch target violations found!');
  }
  
  console.log('\n🛠️  Quick Commands:');
  console.log('  # Auto-fix undersized buttons:');
  console.log('  npx jscodeshift -t scripts/codemod-touch-targets.js "src/**/*.{ts,tsx}"');
  console.log('  # Full validation:');
  console.log('  tsx scripts/validate-phase3.ts');
  
  // Exit code for CI
  process.exit(results.summary.status === 'FAIL' ? 1 : 0);
}

main().catch(error => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
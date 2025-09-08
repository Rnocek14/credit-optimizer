#!/usr/bin/env tsx

/**
 * Quick Smoke Test - Touch Targets & Basic Accessibility
 * Validates 48px minimum touch targets and basic spacing compliance
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ValidationIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
}

const issues: ValidationIssue[] = [];

// Patterns that indicate undersized touch targets
const undersizedTargetPatterns = [
  /className="[^"]*\b(min-h|h)-(8|9|10|11)\b/g,
  /className="[^"]*\bw-(8|9|10|11)\b.*\bmin-h-(8|9|10|11)\b/g,
  /onClick.*className="[^"]*\b(p-1|p-2|px-1|px-2|py-1|py-2)\b/g
];

// Safe patterns that are allowed
const safePatterns = [
  /focus:/,
  /hover:/,
  /\btext-/,
  /border-/
];

function scanFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip comments and non-interactive elements
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;
    
    // Check for undersized interactive targets
    undersizedTargetPatterns.forEach((pattern) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        // Skip if it's a safe pattern
        const isSafe = safePatterns.some(safePattern => safePattern.test(line));
        if (isSafe) continue;
        
        // Check if it's on an interactive element
        const isInteractive = /\b(onClick|onPress|Button|button|Link|link)\b/.test(line);
        if (isInteractive) {
          issues.push({
            file: filePath,
            line: index + 1,
            issue: `Interactive element may be too small: ${match[0]}`,
            severity: 'error'
          });
        }
      }
    });
    
    // Check for missing motion-safe prefixes on animations
    if (/\banimate-/.test(line) && !/motion-safe:/.test(line)) {
      issues.push({
        file: filePath,
        line: index + 1,
        issue: 'Animation should be wrapped with motion-safe: prefix',
        severity: 'warning'
      });
    }
  });
}

function scanDirectory(dir: string) {
  const items = readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      scanFile(fullPath);
    }
  });
}

function runSmokeTest() {
  console.log('🔍 Running Quick Smoke Test...\n');
  
  // Scan src directory
  scanDirectory('src');
  
  // Generate report
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  console.log('📊 SMOKE TEST RESULTS\n');
  console.log('=' .repeat(40));
  
  if (errors.length === 0) {
    console.log('✅ Touch Targets: PASS (no critical issues)');
  } else {
    console.log(`❌ Touch Targets: FAIL (${errors.length} issues)`);
    errors.forEach(issue => {
      console.log(`   🚨 ${issue.file}:${issue.line} - ${issue.issue}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ Warnings: ${warnings.length}`);
    warnings.slice(0, 5).forEach(issue => {
      console.log(`   ⚠️ ${issue.file}:${issue.line} - ${issue.issue}`);
    });
    if (warnings.length > 5) {
      console.log(`   ... and ${warnings.length - 5} more warnings`);
    }
  }
  
  console.log('\n' + '=' .repeat(40));
  
  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log(`\n🎯 Status: ${status}`);
  
  if (status === 'PASS') {
    console.log('✨ All critical accessibility checks passed!');
  } else {
    console.log('🛑 Fix critical issues before deployment.');
    console.log('\n💡 Quick fix: Use h-12/min-h-12 for interactive elements');
  }
  
  return errors.length === 0;
}

// Run the test
const passed = runSmokeTest();
process.exit(passed ? 0 : 1);
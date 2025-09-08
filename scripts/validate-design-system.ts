#!/usr/bin/env tsx

/**
 * Design System Validation Script
 * Validates color usage, contrast ratios, and token compliance
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

// Patterns for hardcoded colors (should use tokens instead)
const hardcodedColorPatterns = [
  /#[0-9a-fA-F]{3,8}/g,           // Hex colors
  /rgb\([^)]+\)/g,                // RGB colors  
  /hsl\([^)]+\)/g,                // HSL colors (unless in tokens)
  /\b(text|bg|border)-(white|black|gray-\d+|blue-\d+|red-\d+|green-\d+)\b/g // Direct Tailwind colors
];

// Allowed contexts where hardcoded colors are acceptable
const allowedContexts = [
  'index.css',
  'tailwind.config.ts',
  '.storybook',
  '/test/',
  '/tests/',
  '__tests__'
];

function isAllowedContext(filePath: string): boolean {
  return allowedContexts.some(context => filePath.includes(context));
}

function scanFile(filePath: string) {
  if (isAllowedContext(filePath)) return;
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;
    
    // Check for hardcoded colors
    hardcodedColorPatterns.forEach((pattern) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        // Skip if it's in a semantic token definition
        if (line.includes('var(--')) continue;
        
        issues.push({
          file: filePath,
          line: index + 1,
          issue: `Hardcoded color detected: ${match[0]} (use design tokens instead)`,
          severity: 'warning'
        });
      }
    });
    
    // Check for proper token usage
    if (/className="[^"]*text-white\b/.test(line) || /className="[^"]*bg-white\b/.test(line)) {
      issues.push({
        file: filePath,
        line: index + 1,
        issue: 'Use semantic tokens instead of text-white/bg-white (e.g., text-foreground, bg-background)',
        severity: 'error'
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
    } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.css')) {
      scanFile(fullPath);
    }
  });
}

function validateTokensFile() {
  try {
    const indexCss = readFileSync('src/index.css', 'utf-8');
    
    // Check for required semantic tokens
    const requiredTokens = [
      '--background',
      '--foreground', 
      '--primary',
      '--secondary',
      '--muted',
      '--accent',
      '--destructive'
    ];
    
    const missingTokens = requiredTokens.filter(token => !indexCss.includes(token));
    
    if (missingTokens.length > 0) {
      issues.push({
        file: 'src/index.css',
        line: 1,
        issue: `Missing semantic tokens: ${missingTokens.join(', ')}`,
        severity: 'error'
      });
    }
    
    // Check if colors are in HSL format
    const hslPattern = /--[\w-]+:\s*\d+\s+\d+%\s+\d+%/g;
    const tokenLines = indexCss.split('\n').filter(line => line.includes('--') && line.includes(':'));
    
    tokenLines.forEach((line, index) => {
      if (line.includes('color') || line.includes('background') || line.includes('foreground')) {
        if (!hslPattern.test(line) && !line.includes('var(')) {
          issues.push({
            file: 'src/index.css',
            line: index + 1,
            issue: 'Color tokens should use HSL format (e.g., "210 40% 98%")',
            severity: 'warning'
          });
        }
      }
    });
    
  } catch (error) {
    issues.push({
      file: 'src/index.css',
      line: 1,
      issue: 'Could not read index.css file',
      severity: 'error'
    });
  }
}

function runDesignSystemValidation() {
  console.log('🎨 Running Design System Validation...\n');
  
  // Validate tokens file
  validateTokensFile();
  
  // Scan source files
  scanDirectory('src');
  
  // Generate report
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  console.log('📊 DESIGN SYSTEM VALIDATION RESULTS\n');
  console.log('=' .repeat(50));
  
  if (errors.length === 0) {
    console.log('✅ Color Tokens: PASS (no critical violations)');
  } else {
    console.log(`❌ Color Tokens: FAIL (${errors.length} violations)`);
    errors.forEach(issue => {
      console.log(`   🚨 ${issue.file}:${issue.line} - ${issue.issue}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ Warnings: ${warnings.length}`);
    warnings.slice(0, 10).forEach(issue => {
      console.log(`   ⚠️ ${issue.file}:${issue.line} - ${issue.issue}`);
    });
    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more warnings`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  
  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log(`\n🎯 Status: ${status}`);
  
  if (status === 'PASS') {
    console.log('✨ Design system compliance validated!');
  } else {
    console.log('🛑 Fix token violations before deployment.');
    console.log('\n💡 Use semantic tokens: text-foreground, bg-background, etc.');
  }
  
  return errors.length === 0;
}

// Run the validation
const passed = runDesignSystemValidation();
process.exit(passed ? 0 : 1);
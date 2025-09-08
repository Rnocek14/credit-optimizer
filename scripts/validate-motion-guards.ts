#!/usr/bin/env tsx

/**
 * Motion Guards Validator - Phase 3 Implementation
 * Scans codebase for unguarded animations and motion preferences violations
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface MotionGuardViolation {
  file: string;
  line: number;
  column: number;
  animation: string;
  type: 'unguarded_animation' | 'missing_reduced_motion' | 'arbitrary_duration';
  severity: 'error' | 'warning';
  suggestion: string;
}

interface MotionValidationResult {
  violations: MotionGuardViolation[];
  totalFiles: number;
  compliantFiles: number;
  unguardedAnimations: number;
  missingReducedMotion: number;
  arbitraryDurations: number;
}

// Animation patterns that require motion guards
const ANIMATION_PATTERNS = [
  /animate-(?!none)\w+/g,                    // Tailwind animate classes
  /@keyframes\s+[\w-]+/g,                   // CSS keyframes
  /animation:\s*[^;]+/g,                    // CSS animation property  
  /transform:\s*[^;]+/g,                    // Transform property
  /transition:\s*(?!colors|opacity)[^;]+/g,  // Complex transitions (not just colors/opacity)
  /translateX\([^)]+\)/g,                   // Transform functions
  /translateY\([^)]+\)/g,
  /scale\([^)]+\)/g,
  /rotate\([^)]+\)/g
];

// Required guard patterns
const GUARD_PATTERNS = [
  /motion-safe:/g,
  /motion-reduce:/g,
  /@media\s*\(\s*prefers-reduced-motion/g,
  /respectsReducedMotion|prefersReducedMotion/g,
  /motionGuards\./g
];

// Exception patterns (allowed without guards)
const EXCEPTION_PATTERNS = [
  /focus:/g,
  /hover:/g,
  /transition-colors/g,
  /transition-opacity/g,
  /transition-shadow/g
];

// Arbitrary duration patterns
const ARBITRARY_DURATION_PATTERNS = [
  /duration-\[\d+(?:ms|s)\]/g,
  /animation-duration:\s*\d+(?:ms|s)/g,
  /transition-duration:\s*\d+(?:ms|s)/g
];

async function validateMotionGuards(): Promise<MotionValidationResult> {
  const result: MotionValidationResult = {
    violations: [],
    totalFiles: 0,
    compliantFiles: 0,
    unguardedAnimations: 0,
    missingReducedMotion: 0,
    arbitraryDurations: 0
  };

  // Find all relevant files
  const files = await glob('src/**/*.{ts,tsx,js,jsx,css}', { 
    ignore: ['src/**/*.test.*', 'src/**/*.stories.*'] 
  });

  result.totalFiles = files.length;

  for (const file of files) {
    const violations = await analyzeFile(file);
    result.violations.push(...violations);

    // Count violation types
    violations.forEach(violation => {
      switch (violation.type) {
        case 'unguarded_animation':
          result.unguardedAnimations++;
          break;
        case 'missing_reduced_motion':
          result.missingReducedMotion++;
          break;
        case 'arbitrary_duration':
          result.arbitraryDurations++;
          break;
      }
    });

    if (violations.length === 0) {
      result.compliantFiles++;
    }
  }

  return result;
}

async function analyzeFile(filePath: string): Promise<MotionGuardViolation[]> {
  const violations: MotionGuardViolation[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check for unguarded animations
    lines.forEach((line, lineIndex) => {
      // Skip if line has guard patterns
      const hasGuard = GUARD_PATTERNS.some(pattern => pattern.test(line));
      if (hasGuard) return;

      // Check for animation patterns
      ANIMATION_PATTERNS.forEach(pattern => {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(line)) !== null) {
          // Check if it's an exception
          const isException = EXCEPTION_PATTERNS.some(exPattern => {
            exPattern.lastIndex = 0;
            return exPattern.test(match[0]);
          });

          if (!isException) {
            violations.push({
              file: filePath,
              line: lineIndex + 1,
              column: match.index + 1,
              animation: match[0],
              type: 'unguarded_animation',
              severity: 'error',
              suggestion: `Add motion-safe: prefix or wrap with @media (prefers-reduced-motion: no-preference)`
            });
          }
        }
      });

      // Check for arbitrary durations
      ARBITRARY_DURATION_PATTERNS.forEach(pattern => {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(line)) !== null) {
          violations.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            animation: match[0],
            type: 'arbitrary_duration',
            severity: 'warning',
            suggestion: 'Use design system motion tokens (--motion-fast, --motion-normal, etc.)'
          });
        }
      });
    });

    // Check for keyframes without reduced motion fallbacks
    const keyframesMatches = content.match(/@keyframes\s+[\w-]+/g);
    if (keyframesMatches) {
      keyframesMatches.forEach(keyframe => {
        if (!content.includes('prefers-reduced-motion')) {
          const lineIndex = content.split(keyframe)[0].split('\n').length;
          violations.push({
            file: filePath,
            line: lineIndex,
            column: 1,
            animation: keyframe,
            type: 'missing_reduced_motion',
            severity: 'warning',
            suggestion: 'Add @media (prefers-reduced-motion: reduce) fallback'
          });
        }
      });
    }

  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
  }

  return violations;
}

function generateMotionGuardReport(result: MotionValidationResult): string {
  const date = new Date().toISOString().split('T')[0];
  const compliancePercentage = ((result.compliantFiles / result.totalFiles) * 100).toFixed(1);
  
  let report = `# Motion Guards Validation Report\n`;
  report += `Generated: ${date}\n\n`;
  
  report += `## Summary\n`;
  report += `- **Total Files Scanned**: ${result.totalFiles}\n`;
  report += `- **Compliant Files**: ${result.compliantFiles}\n`;
  report += `- **Compliance Rate**: ${compliancePercentage}%\n`;
  report += `- **Total Violations**: ${result.violations.length}\n\n`;
  
  report += `## Violation Breakdown\n`;
  report += `- **Unguarded Animations**: ${result.unguardedAnimations} (Critical)\n`;
  report += `- **Missing Reduced Motion**: ${result.missingReducedMotion} (Warning)\n`;
  report += `- **Arbitrary Durations**: ${result.arbitraryDurations} (Warning)\n\n`;

  if (result.violations.length > 0) {
    report += `## Detailed Violations\n\n`;
    
    // Group violations by type
    const groupedViolations = result.violations.reduce((acc, violation) => {
      if (!acc[violation.type]) acc[violation.type] = [];
      acc[violation.type].push(violation);
      return acc;
    }, {} as Record<string, MotionGuardViolation[]>);

    Object.entries(groupedViolations).forEach(([type, violations]) => {
      const typeTitle = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      report += `### ${typeTitle} (${violations.length})\n\n`;
      
      violations.slice(0, 10).forEach(violation => { // Limit to first 10 per type
        report += `**${violation.file}:${violation.line}:${violation.column}**\n`;
        report += `- Animation: \`${violation.animation}\`\n`;
        report += `- Severity: ${violation.severity}\n`;
        report += `- Suggestion: ${violation.suggestion}\n\n`;
      });

      if (violations.length > 10) {
        report += `... and ${violations.length - 10} more violations of this type.\n\n`;
      }
    });
  }

  report += `## Remediation Guide\n\n`;
  report += `### 1. Add Motion Guards\n`;
  report += `\`\`\`tsx\n`;
  report += `// Before (unguarded)\n`;
  report += `<div className="animate-bounce">\n\n`;
  report += `// After (with motion guard)\n`;
  report += `<div className="motion-safe:animate-bounce">\n`;
  report += `\`\`\`\n\n`;

  report += `### 2. Add Reduced Motion Support\n`;
  report += `\`\`\`css\n`;
  report += `@keyframes slideIn {\n`;
  report += `  from { transform: translateX(-100%); }\n`;
  report += `  to { transform: translateX(0); }\n`;
  report += `}\n\n`;
  report += `@media (prefers-reduced-motion: reduce) {\n`;
  report += `  .slide-animation {\n`;
  report += `    animation: none;\n`;
  report += `    transform: translateX(0);\n`;
  report += `  }\n`;
  report += `}\n`;
  report += `\`\`\`\n\n`;

  report += `### 3. Use Motion Tokens\n`;
  report += `\`\`\`tsx\n`;
  report += `// Before\n`;
  report += `className="duration-[300ms]"\n\n`;
  report += `// After\n`;
  report += `className="duration-normal" // Uses --motion-normal token\n`;
  report += `\`\`\`\n\n`;

  return report;
}

async function main() {
  console.log('🎬 Validating motion guards and reduced motion support...\n');
  
  const result = await validateMotionGuards();
  const report = generateMotionGuardReport(result);
  
  // Write report to file
  const reportPath = `reports/motion-guards-${new Date().toISOString().split('T')[0]}.md`;
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
  } catch (error) {
    console.error('Failed to write report:', error);
  }

  // Console output
  console.log(`📊 Motion Guards Validation Complete`);
  console.log(`   Files Scanned: ${result.totalFiles}`);
  console.log(`   Compliant: ${result.compliantFiles}`);
  console.log(`   Violations: ${result.violations.length}`);
  console.log(`   Compliance: ${((result.compliantFiles / result.totalFiles) * 100).toFixed(1)}%\n`);

  if (result.unguardedAnimations > 0) {
    console.log(`❌ Critical: ${result.unguardedAnimations} unguarded animations found`);
  }
  
  if (result.missingReducedMotion > 0) {
    console.log(`⚠️  Warning: ${result.missingReducedMotion} keyframes missing reduced motion support`);
  }

  if (result.arbitraryDurations > 0) {
    console.log(`💡 Info: ${result.arbitraryDurations} arbitrary durations found (use motion tokens)`);
  }

  // Exit with error code if critical violations found
  const hasErrors = result.unguardedAnimations > 0;
  process.exit(hasErrors ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { validateMotionGuards, generateMotionGuardReport };
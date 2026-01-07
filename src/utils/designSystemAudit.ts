/**
 * Design System Audit Utilities
 * Tools for validating and maintaining design system compliance
 */

// Color contrast validation using WCAG standards
export function validateContrastRatio(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): { passes: boolean; ratio: number; required: number } {
  // This is a simplified version - in production, use a proper color contrast library
  const requiredRatios = {
    AA: 4.5,
    AAA: 7.0,
  };
  
  // Mock calculation - replace with actual contrast calculation
  const mockRatio = 4.6; // This would be calculated from actual colors
  
  return {
    passes: mockRatio >= requiredRatios[level],
    ratio: mockRatio,
    required: requiredRatios[level],
  };
}

// Typography validation
export function validateTypography(fontSize: number, lineHeight?: number): {
  fontSize: { valid: boolean; minimum: number };
  lineHeight: { valid: boolean; minimum: number; maximum: number };
} {
  const minFontSize = 14; // 14px minimum for WCAG
  const minLineHeight = 1.2;
  const maxLineHeight = 1.6;
  
  return {
    fontSize: {
      valid: fontSize >= minFontSize,
      minimum: minFontSize,
    },
    lineHeight: {
      valid: lineHeight ? lineHeight >= minLineHeight && lineHeight <= maxLineHeight : true,
      minimum: minLineHeight,
      maximum: maxLineHeight,
    },
  };
}

// Touch target validation
export function validateTouchTarget(width: number, height: number): {
  valid: boolean;
  minimum: number;
  recommendations: string[];
} {
  const minimum = 44; // 44px minimum for WCAG AAA
  const valid = width >= minimum && height >= minimum;
  
  const recommendations: string[] = [];
  if (width < minimum) recommendations.push(`Increase width to ${minimum}px`);
  if (height < minimum) recommendations.push(`Increase height to ${minimum}px`);
  
  return {
    valid,
    minimum,
    recommendations,
  };
}

// Design token validation
export function validateDesignTokens(tokens: Record<string, string>): {
  valid: boolean;
  errors: Array<{ token: string; error: string }>;
} {
  const errors: Array<{ token: string; error: string }> = [];
  
  Object.entries(tokens).forEach(([token, value]) => {
    // Validate color tokens use var() directly (OKLCH values are in the CSS vars)
    // Invalid patterns: hsl(var(--...) or oklch(var(--...) - these double-wrap
    if (token.includes('color') && (value.includes('hsl(var(') || value.includes('oklch(var('))) {
      errors.push({
        token,
        error: 'Color tokens must use var(--xxx) directly - do not wrap in hsl() or oklch()',
      });
    }
    
    // Validate spacing tokens use consistent units
    if (token.includes('spacing') && !value.includes('rem') && !value.includes('px')) {
      errors.push({
        token,
        error: 'Spacing tokens must use rem or px units',
      });
    }
    
    // Validate typography tokens
    if (token.includes('font-size')) {
      const sizeValue = parseFloat(value);
      if (sizeValue < 0.875) { // Less than 14px
        errors.push({
          token,
          error: 'Font size must be at least 14px (0.875rem) for accessibility',
        });
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Component audit utilities
export function auditComponent(componentName: string, classList: string[]): {
  warnings: string[];
  suggestions: string[];
  score: number;
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for deprecated classes
  const deprecatedClasses = ['text-xs'];
  classList.forEach(cls => {
    if (deprecatedClasses.includes(cls)) {
      warnings.push(`Deprecated class "${cls}" should be replaced with "text-readable-xs"`);
    }
  });
  
  // Check for hardcoded colors
  const hardcodedColorPattern = /^(text-|bg-|border-)(purple|blue|red|green)-\d+$/;
  classList.forEach(cls => {
    if (hardcodedColorPattern.test(cls)) {
      suggestions.push(`Consider using semantic token instead of "${cls}"`);
    }
  });
  
  // Check for touch target compliance in interactive elements
  const isInteractive = componentName.toLowerCase().includes('button') || 
                       componentName.toLowerCase().includes('link');
  
  if (isInteractive && !classList.some(cls => cls.includes('min-h-[44px]') || cls.includes('touch-target'))) {
    warnings.push('Interactive element may not meet 44px touch target requirement');
  }
  
  // Calculate score (100 - 10 points per warning - 5 points per suggestion)
  const score = Math.max(0, 100 - (warnings.length * 10) - (suggestions.length * 5));
  
  return {
    warnings,
    suggestions,
    score,
  };
}

// Migration progress tracker
export interface MigrationProgress {
  totalFiles: number;
  migratedFiles: number;
  deprecatedInstances: {
    textXs: number;
    hardcodedColors: number;
    touchTargets: number;
  };
  completionPercentage: number;
}

export function calculateMigrationProgress(
  fileStats: Array<{
    file: string;
    textXsCount: number;
    hardcodedColorCount: number;
    touchTargetIssues: number;
    migrated: boolean;
  }>
): MigrationProgress {
  const totalFiles = fileStats.length;
  const migratedFiles = fileStats.filter(f => f.migrated).length;
  
  const deprecatedInstances = fileStats.reduce(
    (acc, file) => ({
      textXs: acc.textXs + file.textXsCount,
      hardcodedColors: acc.hardcodedColors + file.hardcodedColorCount,
      touchTargets: acc.touchTargets + file.touchTargetIssues,
    }),
    { textXs: 0, hardcodedColors: 0, touchTargets: 0 }
  );
  
  const completionPercentage = totalFiles > 0 ? (migratedFiles / totalFiles) * 100 : 0;
  
  return {
    totalFiles,
    migratedFiles,
    deprecatedInstances,
    completionPercentage: Math.round(completionPercentage),
  };
}

// Generate audit report
export function generateAuditReport(progress: MigrationProgress): string {
  return `
# Design System Migration Audit Report

## Overall Progress: ${progress.completionPercentage}%

### Files Status
- ✅ Migrated: ${progress.migratedFiles}/${progress.totalFiles} files
- 🔄 Remaining: ${progress.totalFiles - progress.migratedFiles} files

### Remaining Issues
- 📝 text-xs instances: ${progress.deprecatedInstances.textXs}
- 🎨 Hardcoded colors: ${progress.deprecatedInstances.hardcodedColors}  
- 👆 Touch target issues: ${progress.deprecatedInstances.touchTargets}

### Next Steps
${progress.completionPercentage < 100 ? `
1. Complete migration of remaining ${progress.totalFiles - progress.migratedFiles} files
2. Fix ${progress.deprecatedInstances.textXs} typography issues
3. Replace ${progress.deprecatedInstances.hardcodedColors} hardcoded colors
4. Resolve ${progress.deprecatedInstances.touchTargets} touch target issues
` : '✅ All migration tasks completed!'}

---
Generated: ${new Date().toISOString()}
  `.trim();
}
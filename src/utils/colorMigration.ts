/**
 * Color Migration Utilities - Phase 2 Implementation
 * Automated migration from hardcoded purple-* classes to semantic OKLCH tokens
 */

// Comprehensive mapping from purple-* utilities to semantic tokens
export const purpleToSemanticMap = {
  // Text colors
  'text-purple-50':  'text-primary-50',
  'text-purple-100': 'text-primary-100',
  'text-purple-200': 'text-primary-200',
  'text-purple-300': 'text-primary-300',
  'text-purple-400': 'text-primary-400',
  'text-purple-500': 'text-primary-500',
  'text-purple-600': 'text-primary-600',
  'text-purple-700': 'text-primary-700',
  'text-purple-800': 'text-primary-800',
  'text-purple-900': 'text-primary-900',

  // Background colors
  'bg-purple-50':  'bg-primary-50',
  'bg-purple-100': 'bg-primary-100',
  'bg-purple-200': 'bg-primary-200',
  'bg-purple-300': 'bg-primary-300',
  'bg-purple-400': 'bg-primary-400',
  'bg-purple-500': 'bg-primary-500',
  'bg-purple-600': 'bg-primary-600',
  'bg-purple-700': 'bg-primary-700',
  'bg-purple-800': 'bg-primary-800',
  'bg-purple-900': 'bg-primary-900',
  'bg-purple-950': 'bg-primary-900',

  // Border colors
  'border-purple-50':  'border-primary-50',
  'border-purple-100': 'border-primary-100',
  'border-purple-200': 'border-primary-200',
  'border-purple-300': 'border-primary-300',
  'border-purple-400': 'border-primary-400',
  'border-purple-500': 'border-primary-500',
  'border-purple-600': 'border-primary-600',
  'border-purple-700': 'border-primary-700',
  'border-purple-800': 'border-primary-800',
  'border-purple-900': 'border-primary-900',

  // Gradient stops
  'from-purple-50':  'from-primary-50',
  'from-purple-100': 'from-primary-100',
  'from-purple-200': 'from-primary-200',
  'from-purple-300': 'from-primary-300',
  'from-purple-400': 'from-primary-400',
  'from-purple-500': 'from-primary-500',
  'from-purple-600': 'from-primary-600',
  'from-purple-700': 'from-primary-700',
  'from-purple-800': 'from-primary-800',
  'from-purple-900': 'from-primary-900',
  'from-purple-950': 'from-primary-900',

  'to-purple-50':  'to-primary-50',
  'to-purple-100': 'to-primary-100',
  'to-purple-200': 'to-primary-200',
  'to-purple-300': 'to-primary-300',
  'to-purple-400': 'to-primary-400',
  'to-purple-500': 'to-primary-500',
  'to-purple-600': 'to-primary-600',
  'to-purple-700': 'to-primary-700',
  'to-purple-800': 'to-primary-800',
  'to-purple-900': 'to-primary-900',
  'to-purple-950': 'to-primary-900',

  'via-purple-50':  'via-primary-50',
  'via-purple-100': 'via-primary-100',
  'via-purple-200': 'via-primary-200',
  'via-purple-300': 'via-primary-300',
  'via-purple-400': 'via-primary-400',
  'via-purple-500': 'via-primary-500',
  'via-purple-600': 'via-primary-600',
  'via-purple-700': 'via-primary-700',
  'via-purple-800': 'via-primary-800',
  'via-purple-900': 'via-primary-900',

  // Colors with opacity modifiers
  'bg-purple-500/10': 'bg-primary-500/10',
  'bg-purple-500/20': 'bg-primary-500/20',
  'bg-purple-50/10': 'bg-primary-50/10',
  'border-purple-500/20': 'border-primary-500/20',
  
  // Dark mode specific mappings (common patterns)
  'dark:bg-purple-900': 'dark:bg-primary-900',
  'dark:bg-purple-950': 'dark:bg-primary-900',
  'dark:text-purple-100': 'dark:text-primary-100',
  'dark:text-purple-200': 'dark:text-primary-200',
  'dark:text-purple-300': 'dark:text-primary-300',
  'dark:border-purple-700': 'dark:border-primary-700',
} as const;

// Additional color mappings for common patterns
export const additionalColorMappings = {
  // Blue to info semantic tokens
  'text-blue-500': 'text-info',
  'text-blue-600': 'text-info-700',
  'bg-blue-50': 'bg-info-light',
  'bg-blue-500': 'bg-info',
  'border-blue-500': 'border-info',

  // Green to success semantic tokens  
  'text-green-600': 'text-success-700',
  'text-green-700': 'text-success-700',
  'bg-green-50': 'bg-success-light',
  'bg-green-500': 'bg-success',
  'border-green-500': 'border-success',

  // Red to destructive semantic tokens
  'text-red-600': 'text-destructive-700',
  'text-red-700': 'text-destructive-700',
  'bg-red-50': 'bg-destructive-light',
  'bg-red-500': 'bg-destructive',
  'border-red-500': 'border-destructive',

  // Yellow to warning semantic tokens
  'text-yellow-600': 'text-warning-700',
  'text-yellow-800': 'text-warning-700', // Fixed duplicate key
  'bg-yellow-50': 'bg-warning-light',
  'bg-yellow-500': 'bg-warning',
  'border-yellow-500': 'border-warning',
} as const;

/**
 * Migration utility to convert old classes to new semantic tokens
 */
export function migrateClassName(className: string): string {
  let result = className;
  
  // Apply purple migrations first (most common)
  Object.entries(purpleToSemanticMap).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass.replace(/[\[\]\/]/g, '\\$&')}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  // Apply additional color migrations
  Object.entries(additionalColorMappings).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass.replace(/[\[\]\/]/g, '\\$&')}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  return result;
}

/**
 * Migration utility for entire className strings
 */
export function migrateClassNames(classNames: string): string {
  return classNames
    .split(/\s+/)
    .map(cls => migrateClassName(cls))
    .join(' ');
}

/**
 * Validation - Check for remaining hardcoded colors
 */
export function validateNoHardcodedColors(content: string): {
  isValid: boolean;
  violations: Array<{ match: string; line?: number; context?: string }>;
} {
  const violations: Array<{ match: string; line?: number; context?: string }> = [];
  
  // Patterns to detect hardcoded colors
  const patterns = [
    /\b(bg|text|border)-(purple|blue|red|green|yellow|indigo|pink|gray)-\d+\b/g,
    /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi,
    /rgb\([^)]+\)/gi,
    /hsl\([^)]+\)/gi,
    /rgba\([^)]+\)/gi,
    /hsla\([^)]+\)/gi,
  ];
  
  const lines = content.split('\n');
  
  patterns.forEach(pattern => {
    lines.forEach((line, index) => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        violations.push({
          match: match[0],
          line: index + 1,
          context: line.trim()
        });
      }
    });
  });
  
  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Generate migration report for a file
 */
export function generateMigrationReport(filePath: string, originalContent: string, migratedContent: string) {
  const originalViolations = validateNoHardcodedColors(originalContent);
  const migratedViolations = validateNoHardcodedColors(migratedContent);
  
  const changesCount = originalViolations.violations.length - migratedViolations.violations.length;
  
  return {
    filePath,
    originalViolations: originalViolations.violations.length,
    remainingViolations: migratedViolations.violations.length,
    changesMade: changesCount,
    isComplete: migratedViolations.violations.length === 0,
    violations: migratedViolations.violations
  };
}
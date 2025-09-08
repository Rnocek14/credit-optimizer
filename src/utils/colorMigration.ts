/**
 * Color Migration Utilities
 * Detects hardcoded colors and validates design system token usage
 */

interface ColorViolation {
  match: string;
  line?: number;
  context?: string;
}

interface ValidationResult {
  isValid: boolean;
  violations: ColorViolation[];
}

// Patterns to detect hardcoded colors
const HARDCODED_COLOR_PATTERNS = [
  // Hex colors
  /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
  // RGB/RGBA functions
  /rgba?\([^)]+\)/g,
  // HSL/HSLA functions
  /hsla?\([^)]+\)/g,
  // Direct Tailwind color utilities (non-semantic)
  /\b(red|blue|green|yellow|purple|pink|indigo|cyan|gray|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|sky|violet|fuchsia|rose)-\d+\b/g,
];

const SEMANTIC_TOKEN_PATTERNS = [
  // Semantic tokens (allowed)
  /\b(primary|secondary|accent|muted|destructive|success|warning|info)-\w+\b/g,
  /\b(background|foreground|card|popover|border|input|ring)\b/g,
];

export function validateNoHardcodedColors(content: string): ValidationResult {
  const violations: ColorViolation[] = [];
  const lines = content.split('\n');
  
  HARDCODED_COLOR_PATTERNS.forEach(pattern => {
    lines.forEach((line, index) => {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(line)) !== null) {
        const matchText = match[0];
        
        // Skip if it's inside a comment
        if (line.includes('//') && line.indexOf('//') < match.index!) {
          continue;
        }
        
        // Skip if it's a semantic token
        const isSemanticToken = SEMANTIC_TOKEN_PATTERNS.some(semanticPattern => {
          semanticPattern.lastIndex = 0;
          return semanticPattern.test(matchText);
        });
        
        if (!isSemanticToken) {
          violations.push({
            match: matchText,
            line: index + 1,
            context: line.trim().substring(Math.max(0, match.index! - 20), match.index! + matchText.length + 20)
          });
        }
      }
    });
  });
  
  return {
    isValid: violations.length === 0,
    violations: violations
  };
}

export function migrateHardcodedColors(content: string): string {
  // Common color migrations
  const colorMigrations: Record<string, string> = {
    '#000000': 'hsl(var(--foreground))',
    '#ffffff': 'hsl(var(--background))',
    '#f8f9fa': 'hsl(var(--muted))',
    '#6c757d': 'hsl(var(--muted-foreground))',
    '#dc3545': 'hsl(var(--destructive))',
    '#28a745': 'hsl(var(--success))',
    '#ffc107': 'hsl(var(--warning))',
    '#007bff': 'hsl(var(--primary))',
    
    // Tailwind color classes to semantic tokens
    'text-red-500': 'text-destructive',
    'bg-red-500': 'bg-destructive',
    'text-green-500': 'text-success',
    'bg-green-500': 'bg-success',
    'text-blue-500': 'text-primary',
    'bg-blue-500': 'bg-primary',
    'text-gray-500': 'text-muted-foreground',
    'bg-gray-100': 'bg-muted',
  };
  
  let migratedContent = content;
  
  Object.entries(colorMigrations).forEach(([oldColor, newColor]) => {
    const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    migratedContent = migratedContent.replace(regex, newColor);
  });
  
  return migratedContent;
}

export function generateColorMigrationReport(violations: ColorViolation[]): string {
  let report = '# Color Migration Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `Total violations: ${violations.length}\n\n`;
  
  if (violations.length > 0) {
    report += '## Violations Found\n\n';
    violations.forEach(({ match, line, context }) => {
      report += `- **${match}** (line ${line})\n`;
      if (context) {
        report += `  Context: \`${context}\`\n`;
      }
      report += '\n';
    });
    
    report += '## Recommended Actions\n\n';
    report += '1. Replace hex colors with semantic tokens: `hsl(var(--primary))`\n';
    report += '2. Use semantic Tailwind classes: `text-primary` instead of `text-blue-500`\n';
    report += '3. Define new semantic tokens in `index.css` if needed\n';
    report += '4. Run the automated migration tool: `npx migrate-colors`\n';
  } else {
    report += '✅ No hardcoded color violations found!\n';
  }
  
  return report;
}
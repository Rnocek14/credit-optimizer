/**
 * Template Audit Utility
 * 
 * Comprehensive audit of all marketplace templates to ensure
 * they provide graduatable paths following all rules and restrictions.
 */

import { validateTemplate, TemplateValidationResult, ValidationIssue } from './templateValidator';

export interface TemplateAuditResult {
  templateId: string;
  label: string;
  anchorSchool: string;
  optimization: string;
  validation: TemplateValidationResult;
  passesAll: boolean;
  errorCount: number;
  warningCount: number;
}

export interface AuditSummary {
  totalTemplates: number;
  passingTemplates: number;
  failingTemplates: number;
  warningsOnly: number;
  bySchool: Record<string, { total: number; passing: number }>;
  byOptimization: Record<string, { total: number; passing: number }>;
  commonIssues: Array<{ code: string; count: number }>;
}

/**
 * Audit a single template
 */
export function auditTemplate(template: any): TemplateAuditResult {
  const validation = validateTemplate(template);
  const errorCount = validation.issues.filter(i => i.type === 'error').length;
  const warningCount = validation.issues.filter(i => i.type === 'warning').length;
  
  return {
    templateId: template.id,
    label: template.label || template.id,
    anchorSchool: template.anchorSchool || 'TESU',
    optimization: template.optimization || 'unknown',
    validation,
    passesAll: errorCount === 0,
    errorCount,
    warningCount,
  };
}

/**
 * Audit all templates and generate summary
 */
export function auditAllTemplates(templates: any[]): {
  results: TemplateAuditResult[];
  summary: AuditSummary;
} {
  const results = templates.map(t => auditTemplate(t));
  
  // Calculate summary
  const bySchool: Record<string, { total: number; passing: number }> = {};
  const byOptimization: Record<string, { total: number; passing: number }> = {};
  const issueCounts: Record<string, number> = {};
  
  for (const result of results) {
    // By school
    if (!bySchool[result.anchorSchool]) {
      bySchool[result.anchorSchool] = { total: 0, passing: 0 };
    }
    bySchool[result.anchorSchool].total++;
    if (result.passesAll) bySchool[result.anchorSchool].passing++;
    
    // By optimization
    if (!byOptimization[result.optimization]) {
      byOptimization[result.optimization] = { total: 0, passing: 0 };
    }
    byOptimization[result.optimization].total++;
    if (result.passesAll) byOptimization[result.optimization].passing++;
    
    // Count issue types
    for (const issue of result.validation.issues) {
      issueCounts[issue.code] = (issueCounts[issue.code] || 0) + 1;
    }
  }
  
  // Sort common issues by frequency
  const commonIssues = Object.entries(issueCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
  
  const summary: AuditSummary = {
    totalTemplates: results.length,
    passingTemplates: results.filter(r => r.passesAll).length,
    failingTemplates: results.filter(r => !r.passesAll).length,
    warningsOnly: results.filter(r => r.passesAll && r.warningCount > 0).length,
    bySchool,
    byOptimization,
    commonIssues,
  };
  
  return { results, summary };
}

/**
 * Generate human-readable audit report
 */
export function generateAuditReport(templates: any[]): string {
  const { results, summary } = auditAllTemplates(templates);
  
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    TEMPLATE AUDIT REPORT                       ',
    '═══════════════════════════════════════════════════════════════',
    '',
    `📊 SUMMARY`,
    `   Total Templates: ${summary.totalTemplates}`,
    `   ✅ Passing: ${summary.passingTemplates}`,
    `   ❌ Failing: ${summary.failingTemplates}`,
    `   ⚠️  Warnings Only: ${summary.warningsOnly}`,
    '',
    `📈 BY SCHOOL`,
  ];
  
  for (const [school, stats] of Object.entries(summary.bySchool)) {
    const pct = Math.round((stats.passing / stats.total) * 100);
    lines.push(`   ${school}: ${stats.passing}/${stats.total} (${pct}%)`);
  }
  
  lines.push('');
  lines.push(`📈 BY OPTIMIZATION`);
  for (const [opt, stats] of Object.entries(summary.byOptimization)) {
    const pct = Math.round((stats.passing / stats.total) * 100);
    lines.push(`   ${opt}: ${stats.passing}/${stats.total} (${pct}%)`);
  }
  
  lines.push('');
  lines.push(`🔥 COMMON ISSUES`);
  for (const issue of summary.commonIssues.slice(0, 10)) {
    lines.push(`   ${issue.code}: ${issue.count} occurrence(s)`);
  }
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                     DETAILED RESULTS                          ');
  lines.push('═══════════════════════════════════════════════════════════════');
  
  for (const result of results) {
    const status = result.passesAll ? '✅' : '❌';
    lines.push('');
    lines.push(`${status} ${result.label}`);
    lines.push(`   ID: ${result.templateId}`);
    lines.push(`   School: ${result.anchorSchool} | Optimization: ${result.optimization}`);
    
    const m = result.validation.metrics;
    lines.push(`   Credits: ${m.totalCredits}/120 | University: ${m.universityCredits} | Upper-Div: ${m.upperDivCredits}`);
    
    if (Object.keys(m.creditsByProvider).length > 0) {
      const providerList = Object.entries(m.creditsByProvider)
        .map(([p, c]) => `${p}:${c}`)
        .join(', ');
      lines.push(`   Providers: ${providerList}`);
    }
    
    if (result.validation.issues.length > 0) {
      lines.push(`   Issues:`);
      for (const issue of result.validation.issues) {
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        lines.push(`      ${icon} [${issue.code}] ${issue.message}`);
      }
    }
  }
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

/**
 * Get fix suggestions for a template
 */
export function getFixSuggestions(result: TemplateAuditResult): string[] {
  const suggestions: string[] = [];
  
  for (const issue of result.validation.issues) {
    switch (issue.code) {
      case 'CREDIT_SHORTFALL':
        suggestions.push(`Add ${issue.details?.shortfall || 0} more credits to reach 120`);
        break;
      case 'RESIDENCY_SHORTFALL':
        suggestions.push(`Add ${issue.details?.shortfall || 0} more ${result.anchorSchool} courses for residency`);
        break;
      case 'UPPER_DIV_SHORTFALL':
        suggestions.push(`Replace ${issue.details?.shortfall || 0} credits with 300/400 level courses`);
        break;
      case 'PROVIDER_CAP_EXCEEDED':
        suggestions.push(`Reduce ${issue.details?.provider} credits by ${issue.details?.shortfall || 0}`);
        break;
      case 'GENED_INCOMPLETE':
        suggestions.push(`Add ${issue.details?.shortfall || 0} credits to ${issue.details?.category}`);
        break;
      case 'UNFILLED_MODULES':
        suggestions.push(`Add more course options to unfilled modules`);
        break;
    }
  }
  
  return suggestions;
}

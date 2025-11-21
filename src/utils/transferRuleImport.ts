import { z } from 'zod';

export interface ParsedTransferRule {
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: 'accepted' | 'elective' | 'rejected';
  rule_source?: string;
  confidence?: number;
  evidence_url?: string;
}

const TransferRuleSchema = z.object({
  source_institution: z.string().min(2).max(20).transform(s => s.toUpperCase().trim()),
  source_course_code: z.string().min(1).max(50).transform(s => s.trim()),
  target_institution: z.string().min(2).max(20).transform(s => s.toUpperCase().trim()),
  target_course_code: z.string().nullable().transform(s => {
    if (!s || s.trim() === '') return null;
    return s.trim();
  }),
  acceptance_status: z.enum(['accepted', 'elective', 'rejected']),
  rule_source: z.string().optional().transform(s => s?.trim() || undefined),
  confidence: z.number().min(0).max(1).optional().or(
    z.string().transform(s => {
      const n = parseFloat(s);
      return isNaN(n) ? undefined : Math.max(0, Math.min(1, n));
    })
  ),
  evidence_url: z.string().url().optional().or(z.literal('')).transform(s => {
    if (!s || s === '') return undefined;
    return s;
  })
});

export function parseTransferRuleCSV(csvText: string): ParsedTransferRule[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Validate required headers
  const requiredHeaders = ['source_institution', 'source_course_code', 'target_institution', 'acceptance_status'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  const rules: ParsedTransferRule[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    try {
      const values = parseCSVLine(line);
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const raw: any = {};
      headers.forEach((header, idx) => {
        raw[header] = values[idx];
      });

      // Ensure target_course_code exists (can be empty string)
      if (!('target_course_code' in raw)) {
        raw.target_course_code = '';
      }

      const parsed = TransferRuleSchema.parse(raw) as ParsedTransferRule;
      rules.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        errors.push(`Row ${i + 1}: ${issues}`);
      } else {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
  }

  if (errors.length > 0) {
    console.warn('CSV parsing errors:', errors);
    // Allow partial success - don't throw, just log
  }

  if (rules.length === 0) {
    throw new Error('No valid rules found in CSV');
  }

  return rules;
}

export function validateTransferRules(rules: ParsedTransferRule[]): ParsedTransferRule[] {
  // Deduplicate based on composite key
  const seen = new Set<string>();
  const deduplicated: ParsedTransferRule[] = [];

  for (const rule of rules) {
    const key = `${rule.source_institution}|${rule.source_course_code}|${rule.target_institution}`;
    
    if (seen.has(key)) {
      console.warn(`Duplicate rule skipped: ${key}`);
      continue;
    }

    seen.add(key);
    deduplicated.push(rule);
  }

  // Apply confidence scoring if not provided
  return deduplicated.map(rule => {
    if (rule.confidence !== undefined) return rule;

    // Auto-calculate confidence based on data quality
    let confidence = 0.5; // baseline

    if (rule.rule_source) {
      confidence += 0.2;
      
      // Higher confidence for official sources
      const officialSources = ['ACE Credit', 'CLEP Equivalency', 'Official Transfer Guide', 'NCCRS'];
      if (officialSources.some(s => rule.rule_source?.includes(s))) {
        confidence += 0.2;
      }
    }

    if (rule.evidence_url) {
      confidence += 0.1;
    }

    if (rule.target_course_code) {
      confidence += 0.1; // More specific = higher confidence
    }

    return {
      ...rule,
      confidence: Math.min(1, confidence)
    };
  });
}

// Helper to properly parse CSV lines (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * TESU Policy Field Validators
 * 
 * Defines expected field paths, types, confidence thresholds,
 * and canonical values for validating GPT extractions.
 */

export type FieldType = 'number' | 'string' | 'boolean' | 'object' | 'array';

export interface FieldValidator {
  path: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  minConfidence: number;
  autoApproveThreshold: number;
  canonicalValue?: unknown;
  description?: string;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    allowedValues?: unknown[];
  };
}

export interface ValidationResult {
  path: string;
  isValid: boolean;
  confidence: number;
  matchesCanonical: boolean;
  extractedValue: unknown;
  canonicalValue?: unknown;
  issues: string[];
}

/**
 * TESU-specific field validators
 * Based on 2025-2026 Undergraduate Catalog
 */
export const TESU_FIELD_VALIDATORS: FieldValidator[] = [
  // Core Degree Requirements
  {
    path: 'total_credits_required',
    displayName: 'Total Credits Required',
    type: 'number',
    required: true,
    minConfidence: 90,
    autoApproveThreshold: 95,
    canonicalValue: 120,
    description: 'Total credits needed for bachelor\'s degree',
    validationRules: { min: 60, max: 180 }
  },
  {
    path: 'residency_credits',
    displayName: 'Minimum Residency Credits',
    type: 'number',
    required: true,
    minConfidence: 90,
    autoApproveThreshold: 95,
    canonicalValue: 15,
    description: 'Minimum credits that must be completed through TESU',
    validationRules: { min: 0, max: 30 }
  },
  {
    path: 'max_ace_nccrs_credits',
    displayName: 'Maximum ACE/NCCRS Credits',
    type: 'number',
    required: true,
    minConfidence: 85,
    autoApproveThreshold: 92,
    canonicalValue: 90,
    description: 'Maximum credits from ACE/NCCRS recommendations',
    validationRules: { min: 0, max: 120 }
  },
  {
    path: 'upper_division_required',
    displayName: 'Upper Division Requirement',
    type: 'number',
    required: true,
    minConfidence: 85,
    autoApproveThreshold: 92,
    canonicalValue: 18,
    description: 'Minimum upper-level (300/400) credits in area of study',
    validationRules: { min: 0, max: 60 }
  },
  {
    path: 'minimum_transfer_grade',
    displayName: 'Minimum Transfer Grade',
    type: 'string',
    required: true,
    minConfidence: 85,
    autoApproveThreshold: 92,
    canonicalValue: 'D',
    description: 'Minimum grade accepted for transfer credit',
    validationRules: { allowedValues: ['A', 'B', 'C', 'D', 'P', 'CR'] }
  },

  // Required In-House Courses
  {
    path: 'required_courses.cornerstone',
    displayName: 'Cornerstone Course',
    type: 'string',
    required: true,
    minConfidence: 90,
    autoApproveThreshold: 95,
    canonicalValue: 'SOS-1100',
    description: 'Required orientation/success course'
  },
  {
    path: 'required_courses.capstone',
    displayName: 'Capstone Required',
    type: 'boolean',
    required: true,
    minConfidence: 90,
    autoApproveThreshold: 95,
    canonicalValue: true,
    description: 'Whether capstone must be completed at TESU'
  },

  // Exam Credits
  {
    path: 'exam_credits.clep_accepted',
    displayName: 'CLEP Accepted',
    type: 'boolean',
    required: true,
    minConfidence: 90,
    autoApproveThreshold: 95,
    canonicalValue: true,
    description: 'Whether CLEP exams are accepted for credit'
  },
  {
    path: 'exam_credits.dsst_accepted',
    displayName: 'DSST Accepted',
    type: 'boolean',
    required: true,
    minConfidence: 90,
    autoApproveThreshold: 95,
    canonicalValue: true,
    description: 'Whether DSST exams are accepted for credit'
  },

  // Provider Requirements
  {
    path: 'provider_requirements.sophia',
    displayName: 'Sophia Transcript Requirement',
    type: 'object',
    required: false,
    minConfidence: 80,
    autoApproveThreshold: 90,
    canonicalValue: {
      transcript_source: 'Credly',
      notes: 'We cannot review Sophia transcripts sent directly from Sophia, LLC'
    },
    description: 'How Sophia credits must be submitted'
  },
  {
    path: 'provider_requirements.studycom',
    displayName: 'Study.com Transcript Requirement',
    type: 'object',
    required: false,
    minConfidence: 80,
    autoApproveThreshold: 90,
    canonicalValue: {
      transcript_source: 'Study.com direct',
      notes: 'We will not accept the credit from the ACE transcript, only the Study.com transcript is acceptable'
    },
    description: 'How Study.com credits must be submitted'
  },

  // Program-Specific Exceptions
  {
    path: 'program_exceptions.bsba_currency',
    displayName: 'BSBA Currency Limitations',
    type: 'object',
    required: false,
    minConfidence: 75,
    autoApproveThreshold: 88,
    canonicalValue: {
      area_of_study_max_age_years: 10,
      capstone_max_age_years: 5
    },
    description: 'Course age limitations for BSBA programs'
  }
];

/**
 * Validate an extracted field against its validator
 */
export function validateField(
  path: string,
  extractedValue: unknown,
  confidence: number
): ValidationResult {
  const validator = TESU_FIELD_VALIDATORS.find(v => v.path === path);
  
  if (!validator) {
    return {
      path,
      isValid: false,
      confidence,
      matchesCanonical: false,
      extractedValue,
      issues: [`Unknown field path: ${path}`]
    };
  }

  const issues: string[] = [];
  let isValid = true;

  // Check confidence threshold
  if (confidence < validator.minConfidence) {
    issues.push(`Confidence ${confidence}% below minimum ${validator.minConfidence}%`);
    isValid = false;
  }

  // Type validation
  const actualType = getValueType(extractedValue);
  if (actualType !== validator.type) {
    issues.push(`Expected type ${validator.type}, got ${actualType}`);
    isValid = false;
  }

  // Validation rules
  if (validator.validationRules && extractedValue !== null) {
    const { min, max, pattern, allowedValues } = validator.validationRules;
    
    if (typeof extractedValue === 'number') {
      if (min !== undefined && extractedValue < min) {
        issues.push(`Value ${extractedValue} below minimum ${min}`);
        isValid = false;
      }
      if (max !== undefined && extractedValue > max) {
        issues.push(`Value ${extractedValue} above maximum ${max}`);
        isValid = false;
      }
    }
    
    if (typeof extractedValue === 'string' && pattern && !pattern.test(extractedValue)) {
      issues.push(`Value doesn't match required pattern`);
      isValid = false;
    }
    
    if (allowedValues && !allowedValues.includes(extractedValue)) {
      issues.push(`Value not in allowed list: ${allowedValues.join(', ')}`);
      isValid = false;
    }
  }

  // Canonical comparison
  const matchesCanonical = validator.canonicalValue !== undefined 
    ? deepEqual(extractedValue, validator.canonicalValue)
    : true;

  if (!matchesCanonical && validator.canonicalValue !== undefined) {
    issues.push(`Differs from canonical value`);
  }

  return {
    path,
    isValid,
    confidence,
    matchesCanonical,
    extractedValue,
    canonicalValue: validator.canonicalValue,
    issues
  };
}

/**
 * Check if a field should be auto-approved
 */
export function shouldAutoApprove(
  path: string,
  extractedValue: unknown,
  confidence: number
): boolean {
  const validator = TESU_FIELD_VALIDATORS.find(v => v.path === path);
  if (!validator) return false;

  // Must meet auto-approve threshold
  if (confidence < validator.autoApproveThreshold) return false;

  // Must match canonical value if one exists
  if (validator.canonicalValue !== undefined) {
    return deepEqual(extractedValue, validator.canonicalValue);
  }

  // Validate against rules
  const result = validateField(path, extractedValue, confidence);
  return result.isValid;
}

/**
 * Get all validators for a given category
 */
export function getValidatorsByCategory(category: string): FieldValidator[] {
  return TESU_FIELD_VALIDATORS.filter(v => v.path.startsWith(category));
}

/**
 * Get required fields that are missing from extraction
 */
export function getMissingRequiredFields(extractedPaths: string[]): FieldValidator[] {
  return TESU_FIELD_VALIDATORS.filter(
    v => v.required && !extractedPaths.includes(v.path)
  );
}

// Helpers
function getValueType(value: unknown): FieldType {
  if (value === null || value === undefined) return 'string';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

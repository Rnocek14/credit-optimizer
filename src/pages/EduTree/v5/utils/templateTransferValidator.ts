/**
 * Template Transfer Validator
 * 
 * Validates that ALL courses in a marketplace template have verified transfer rules
 * to the anchor institution. This is the foundation of "decentralized degrees" -
 * every course must be provably transferable.
 */

import { checkTransferRule, TransferRuleCheckResult } from '../engine/transferEngine';

// ============================================================================
// Types
// ============================================================================

export interface CourseTransferStatus {
  courseId: string;
  providerCode: string;
  title: string;
  credits: number;
  level: number;
  status: 'verified' | 'elective-only' | 'unverified' | 'institutional';
  confidence: number;
  targetEquivCode?: string;
  requirementArea?: string;
}

export interface ModuleTransferValidation {
  moduleId: string;
  label: string;
  courses: CourseTransferStatus[];
  allVerified: boolean;
  hasUnverified: boolean;
  hasElectiveOnly: boolean;
}

export interface TemplateTransferValidationResult {
  templateId: string;
  anchorSchool: string;
  valid: boolean;
  totalCourses: number;
  verifiedCourses: number;
  electiveOnlyCourses: number;
  unverifiedCourses: number;
  institutionalCourses: number;
  modules: ModuleTransferValidation[];
  unverifiedList: CourseTransferStatus[];
  summary: string;
}

// ============================================================================
// Core Validation
// ============================================================================

/**
 * Validates that all courses in a template have verified transfer rules
 * 
 * This is the CRITICAL function for ensuring decentralized degrees work.
 * Every course a student takes must have a verified path to the anchor school.
 */
export async function validateTemplateTransferability(
  template: any
): Promise<TemplateTransferValidationResult> {
  const anchorSchool = (template.anchorSchool || 'TESU').toUpperCase();
  const modules: ModuleTransferValidation[] = [];
  const unverifiedList: CourseTransferStatus[] = [];
  
  let totalCourses = 0;
  let verifiedCourses = 0;
  let electiveOnlyCourses = 0;
  let unverifiedCourses = 0;
  let institutionalCourses = 0;
  
  // Process all modules in the template
  for (const yearTemplate of template.yearTemplates || []) {
    for (const moduleTemplate of yearTemplate.moduleTemplates || []) {
      const { moduleId, label, options, requirementArea } = moduleTemplate;
      const courses: CourseTransferStatus[] = [];
      let moduleAllVerified = true;
      let moduleHasUnverified = false;
      let moduleHasElectiveOnly = false;
      
      // Check each course option
      for (const option of options || []) {
        totalCourses++;
        
        const providerCode = String(option.providerCode || option.provider || 'UNKNOWN').toUpperCase();
        const courseId = option.courseId;
        const title = option.title || courseId;
        const credits = option.credits || 3;
        const level = option.level || 100;
        
        // Check if this is an institutional course (auto-verified)
        if (providerCode === anchorSchool) {
          institutionalCourses++;
          courses.push({
            courseId,
            providerCode,
            title,
            credits,
            level,
            status: 'institutional',
            confidence: 1.0,
            targetEquivCode: courseId,
            requirementArea,
          });
          continue;
        }
        
        // Query the transfer engine for verification
        const rule = await checkTransferRule(providerCode, courseId, anchorSchool, {
          requirementType: deriveRequirementType(requirementArea),
          minConfidence: 0.7,
        });
        
        const courseStatus: CourseTransferStatus = {
          courseId,
          providerCode,
          title,
          credits,
          level,
          status: getStatusFromRule(rule),
          confidence: rule.confidence,
          targetEquivCode: rule.targetEquivCode,
          requirementArea,
        };
        
        courses.push(courseStatus);
        
        // Update counters and flags
        if (rule.accepted && !rule.electiveOnly) {
          verifiedCourses++;
        } else if (rule.electiveOnly) {
          electiveOnlyCourses++;
          moduleHasElectiveOnly = true;
        } else {
          unverifiedCourses++;
          moduleHasUnverified = true;
          moduleAllVerified = false;
          unverifiedList.push(courseStatus);
        }
      }
      
      modules.push({
        moduleId,
        label: label || moduleId,
        courses,
        allVerified: moduleAllVerified,
        hasUnverified: moduleHasUnverified,
        hasElectiveOnly: moduleHasElectiveOnly,
      });
    }
  }
  
  const valid = unverifiedCourses === 0;
  
  // Generate summary
  let summary: string;
  if (valid && electiveOnlyCourses === 0) {
    summary = `✅ All ${totalCourses} courses verified for ${anchorSchool}`;
  } else if (valid) {
    summary = `✅ ${verifiedCourses} verified, ${electiveOnlyCourses} as electives for ${anchorSchool}`;
  } else {
    summary = `❌ ${unverifiedCourses} of ${totalCourses} courses have NO verified transfer rule to ${anchorSchool}`;
  }
  
  return {
    templateId: template.id || 'unknown',
    anchorSchool,
    valid,
    totalCourses,
    verifiedCourses,
    electiveOnlyCourses,
    unverifiedCourses,
    institutionalCourses,
    modules,
    unverifiedList,
    summary,
  };
}

/**
 * Validate a single course's transfer status
 */
export async function validateCourseTransfer(
  providerCode: string,
  courseId: string,
  targetSchool: string,
  requirementArea?: string
): Promise<CourseTransferStatus> {
  const provider = providerCode.toUpperCase();
  const target = targetSchool.toUpperCase();
  
  // Institutional courses are always valid
  if (provider === target) {
    return {
      courseId,
      providerCode: provider,
      title: courseId,
      credits: 0,
      level: 0,
      status: 'institutional',
      confidence: 1.0,
      targetEquivCode: courseId,
      requirementArea,
    };
  }
  
  const rule = await checkTransferRule(provider, courseId, target, {
    requirementType: deriveRequirementType(requirementArea),
    minConfidence: 0.7,
  });
  
  return {
    courseId,
    providerCode: provider,
    title: courseId,
    credits: 0,
    level: 0,
    status: getStatusFromRule(rule),
    confidence: rule.confidence,
    targetEquivCode: rule.targetEquivCode,
    requirementArea,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusFromRule(rule: TransferRuleCheckResult): CourseTransferStatus['status'] {
  if (rule.confidence >= 1.0) return 'institutional';
  if (rule.accepted && !rule.electiveOnly) return 'verified';
  if (rule.electiveOnly) return 'elective-only';
  return 'unverified';
}

function deriveRequirementType(area?: string): 'major' | 'elective' | 'genED' {
  if (!area) return 'elective';
  
  const areaUpper = area.toUpperCase();
  
  // Core/Major requirements
  if (
    areaUpper.includes('CS_CORE') ||
    areaUpper.includes('MATH_CORE') ||
    areaUpper.includes('MAJOR')
  ) {
    return 'major';
  }
  
  // Gen Ed
  if (
    areaUpper.includes('WRITTEN') ||
    areaUpper.includes('ORAL') ||
    areaUpper.includes('HUMANITIES') ||
    areaUpper.includes('SOCIAL') ||
    areaUpper.includes('NATURAL') ||
    areaUpper.includes('QUANTITATIVE')
  ) {
    return 'genED';
  }
  
  return 'elective';
}

/**
 * Get a list of all unverified courses that need transfer rules added
 */
export function getUnverifiedCoursesReport(
  result: TemplateTransferValidationResult
): string {
  if (result.unverifiedList.length === 0) {
    return 'All courses have verified transfer rules.';
  }
  
  const lines = [
    `Missing Transfer Rules for ${result.anchorSchool}:`,
    '',
  ];
  
  for (const course of result.unverifiedList) {
    lines.push(
      `- ${course.providerCode} | ${course.courseId} | ${course.title} (${course.credits}cr, L${course.level})`
    );
  }
  
  lines.push('');
  lines.push('Add these courses to credit_transfer_rules table to enable this template.');
  
  return lines.join('\n');
}

/**
 * Credit Policy Engine - Validates course selections against institutional policies
 * Handles transfer caps, residency requirements, equivalency, and Florida articulation
 */

import { PlanNode, NodeType } from '../types/v4';
import { floridaArticulationMappings, FloridaArticulationMapping } from '@/lib/florida/articulation-data';

export type PolicySeverity = 'error' | 'warning' | 'info';

export interface PolicyViolation {
  id: string;
  severity: PolicySeverity;
  message: string;
  detail?: string;
  affectedCourses?: string[];
}

export interface PolicyStatus {
  transferable: boolean;
  accredited: boolean;
  articulated: boolean;
  articulationId?: string;
  violations: PolicyViolation[];
}

export interface ComplianceMetrics {
  transferCreditsUsed: number;
  transferCreditsMax: number;
  residencyCreditsEarned: number;
  residencyCreditsRequired: number;
  expiredCourses: number;
  overallScore: number; // 0-100
  violations: PolicyViolation[];
}

export interface CreditPolicy {
  maxTransferCredits: number;
  residencyMinimum: number;
  transferExpirationYears?: number;
  allowedSources: Array<'institution' | 'transfer' | 'exam' | 'other'>;
  articulationMappings?: FloridaArticulationMapping[];
}

// Default CS degree policy for Florida universities
export const DEFAULT_FL_POLICY: CreditPolicy = {
  maxTransferCredits: 60,
  residencyMinimum: 30,
  transferExpirationYears: 7,
  allowedSources: ['institution', 'transfer', 'exam', 'other'],
  articulationMappings: floridaArticulationMappings,
};

export class CreditPolicyEngine {
  private policy: CreditPolicy;
  private targetInstitution: string;

  constructor(policy: CreditPolicy = DEFAULT_FL_POLICY, targetInstitution: string = 'ucf') {
    this.policy = policy;
    this.targetInstitution = targetInstitution;
  }

  /**
   * Validate a course selection against all policy rules
   */
  validateCourseSelection(
    course: PlanNode,
    currentPlan: PlanNode[],
    sourceInstitution?: string
  ): PolicyStatus {
    const violations: PolicyViolation[] = [];
    let transferable = true;
    let accredited = true;
    let articulated = false;
    let articulationId: string | undefined;

    // Check if course is from transfer source
    const isTransfer = course.data.source === 'transfer' || course.data.source === 'exam';

    // 1. Check transfer credit cap
    if (isTransfer) {
      const transferCapViolation = this.checkTransferCap(course, currentPlan);
      if (transferCapViolation) {
        violations.push(transferCapViolation);
        if (transferCapViolation.severity === 'error') {
          transferable = false;
        }
      }
    }

    // 2. Check articulation mapping (if transfer and source institution provided)
    if (isTransfer && sourceInstitution) {
      const articulationResult = this.getArticulationMapping(
        course.data.label,
        sourceInstitution,
        this.targetInstitution
      );
      
      if (articulationResult) {
        articulated = true;
        articulationId = articulationResult.id;
        
        violations.push({
          id: 'articulated',
          severity: 'info',
          message: `✅ Guaranteed transfer via ${articulationResult.id}`,
          detail: `Transfers as ${articulationResult.targetCourse.code} with ${articulationResult.transferRate * 100}% credit value`,
        });
      } else if (isTransfer) {
        violations.push({
          id: 'no-articulation',
          severity: 'warning',
          message: '⚠️ No guaranteed articulation agreement',
          detail: 'This course may not transfer. Consult with academic advisor.',
        });
        transferable = false;
      }
    }

    // 3. Check expiration (for science/math courses)
    if (isTransfer && course.data.expiresOn) {
      const expirationViolation = this.checkExpiration(course);
      if (expirationViolation) {
        violations.push(expirationViolation);
      }
    }

    // 4. Check accreditation (for marketplace courses)
    if (course.data.providerId && !course.data.transferable) {
      accredited = false;
      violations.push({
        id: 'non-accredited',
        severity: 'warning',
        message: '⚠️ Non-transferable marketplace course',
        detail: 'This course may not count toward degree requirements. Verify with institution.',
      });
    }

    // 5. Check mutual exclusivity (can't take both CS205 and CS205 from marketplace)
    const mutualExclusionViolation = this.checkMutualExclusion(course, currentPlan);
    if (mutualExclusionViolation) {
      violations.push(mutualExclusionViolation);
    }

    return {
      transferable,
      accredited,
      articulated,
      articulationId,
      violations,
    };
  }

  /**
   * Check if adding this course would exceed transfer credit cap
   */
  private checkTransferCap(course: PlanNode, currentPlan: PlanNode[]): PolicyViolation | null {
    const transferCredits = currentPlan
      .filter(n => n.type === NodeType.Course && (n.data.source === 'transfer' || n.data.source === 'exam'))
      .reduce((sum, n) => sum + (n.data.credits || 0), 0);

    const newTotal = transferCredits + (course.data.credits || 0);

    if (newTotal > this.policy.maxTransferCredits) {
      return {
        id: 'transfer-cap-exceeded',
        severity: 'error',
        message: `❌ Transfer credit limit exceeded`,
        detail: `You would have ${newTotal}/${this.policy.maxTransferCredits} transfer credits. Maximum allowed: ${this.policy.maxTransferCredits}.`,
        affectedCourses: [course.data.label],
      };
    }

    if (newTotal > this.policy.maxTransferCredits * 0.9) {
      return {
        id: 'transfer-cap-warning',
        severity: 'warning',
        message: `⚠️ Approaching transfer credit limit`,
        detail: `You will have ${newTotal}/${this.policy.maxTransferCredits} transfer credits. Consider residency requirements.`,
      };
    }

    return null;
  }

  /**
   * Check if course has expired (for science/math with 7-year limit)
   */
  private checkExpiration(course: PlanNode): PolicyViolation | null {
    if (!course.data.expiresOn) return null;

    const expirationDate = new Date(course.data.expiresOn);
    const now = new Date();

    if (expirationDate < now) {
      return {
        id: 'course-expired',
        severity: 'error',
        message: `❌ Course credit expired`,
        detail: `${course.data.label} credit expired on ${expirationDate.toLocaleDateString()}. Must retake.`,
        affectedCourses: [course.data.label],
      };
    }

    return null;
  }

  /**
   * Check for mutual exclusion (can't take same course from multiple sources)
   */
  private checkMutualExclusion(course: PlanNode, currentPlan: PlanNode[]): PolicyViolation | null {
    const duplicates = currentPlan.filter(
      n => n.type === NodeType.Course && n.data.label === course.data.label && n.id !== course.id
    );

    if (duplicates.length > 0) {
      return {
        id: 'duplicate-course',
        severity: 'error',
        message: `❌ Course already in plan`,
        detail: `${course.data.label} is already in your plan. Cannot add duplicate.`,
        affectedCourses: [course.data.label],
      };
    }

    return null;
  }

  /**
   * Find articulation mapping for a course between institutions
   */
  getArticulationMapping(
    courseCode: string,
    sourceInstitution: string,
    targetInstitution: string
  ): FloridaArticulationMapping | null {
    if (!this.policy.articulationMappings) return null;

    return this.policy.articulationMappings.find(
      mapping =>
        mapping.sourceInstitution === sourceInstitution &&
        mapping.targetInstitution === targetInstitution &&
        (mapping.sourceCourse.code === courseCode || mapping.sourceCourse.title.includes(courseCode))
    ) || null;
  }

  /**
   * Check residency compliance for entire plan
   */
  checkResidencyCompliance(plan: PlanNode[]): PolicyViolation | null {
    const residencyCourses = plan.filter(
      n => n.type === NodeType.Course && n.data.source === 'institution'
    );

    const residencyCredits = residencyCourses.reduce((sum, n) => sum + (n.data.credits || 0), 0);

    if (residencyCredits < this.policy.residencyMinimum) {
      return {
        id: 'residency-requirement',
        severity: 'error',
        message: `❌ Residency requirement not met`,
        detail: `Need ${this.policy.residencyMinimum - residencyCredits} more in-residence credits. Current: ${residencyCredits}/${this.policy.residencyMinimum}.`,
      };
    }

    return null;
  }

  /**
   * Calculate compliance score and metrics for entire plan
   */
  calculateComplianceScore(plan: PlanNode[]): ComplianceMetrics {
    const violations: PolicyViolation[] = [];

    // Count transfer credits
    const transferCourses = plan.filter(
      n => n.type === NodeType.Course && (n.data.source === 'transfer' || n.data.source === 'exam')
    );
    const transferCreditsUsed = transferCourses.reduce((sum, n) => sum + (n.data.credits || 0), 0);

    // Count residency credits
    const residencyCourses = plan.filter(
      n => n.type === NodeType.Course && n.data.source === 'institution'
    );
    const residencyCreditsEarned = residencyCourses.reduce((sum, n) => sum + (n.data.credits || 0), 0);

    // Count expired courses
    const expiredCourses = plan.filter(n => {
      if (!n.data.expiresOn) return false;
      return new Date(n.data.expiresOn) < new Date();
    }).length;

    // Check residency
    const residencyViolation = this.checkResidencyCompliance(plan);
    if (residencyViolation) {
      violations.push(residencyViolation);
    }

    // Check transfer cap
    if (transferCreditsUsed > this.policy.maxTransferCredits) {
      violations.push({
        id: 'transfer-cap-global',
        severity: 'error',
        message: `❌ Transfer credit limit exceeded`,
        detail: `Total transfer credits: ${transferCreditsUsed}/${this.policy.maxTransferCredits}`,
      });
    }

    // Check expired courses
    if (expiredCourses > 0) {
      violations.push({
        id: 'expired-courses',
        severity: 'error',
        message: `❌ ${expiredCourses} expired course(s)`,
        detail: `Science/math courses must be retaken if older than ${this.policy.transferExpirationYears} years`,
      });
    }

    // Calculate overall score (0-100)
    let score = 100;
    
    // Deduct for violations
    violations.forEach(v => {
      if (v.severity === 'error') score -= 20;
      if (v.severity === 'warning') score -= 10;
    });

    // Deduct for approaching limits
    if (transferCreditsUsed > this.policy.maxTransferCredits * 0.8) {
      score -= 5;
    }
    if (residencyCreditsEarned < this.policy.residencyMinimum * 1.2) {
      score -= 5;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      transferCreditsUsed,
      transferCreditsMax: this.policy.maxTransferCredits,
      residencyCreditsEarned,
      residencyCreditsRequired: this.policy.residencyMinimum,
      expiredCourses,
      overallScore: score,
      violations,
    };
  }

  /**
   * Get equivalent courses from articulation mappings
   */
  getEquivalentCourses(courseCode: string): FloridaArticulationMapping[] {
    if (!this.policy.articulationMappings) return [];

    return this.policy.articulationMappings.filter(
      mapping =>
        mapping.sourceCourse.code === courseCode ||
        mapping.targetCourse.code === courseCode
    );
  }
}

// Export singleton instance
export const defaultPolicyEngine = new CreditPolicyEngine();

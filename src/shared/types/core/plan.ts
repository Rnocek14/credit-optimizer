/**
 * Core plan primitives — degree-agnostic, not EduTree-specific.
 */

export interface DegreePlan {
  templateId: string;
  institutionCode: string;
  semesters: Array<{
    id: string;
    label: string;
    courseIds: string[];
  }>;
  costEstimate?: {
    tuitionUsd?: number;
    feesUsd?: number;
    totalUsd?: number;
  };
}

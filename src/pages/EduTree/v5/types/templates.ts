import type { MarketplaceOption, ProviderType } from './v5';

// Template kinds for progressive disclosure
export type TemplateKind = 'module' | 'year' | 'degree';

// Canonical requirement IDs (maps to RequirementBlock.slug from blockMapping)
export type CanonicalId = string;

/**
 * Template validation result with dual-mode support:
 * - Canonical fit (always computed)
 * - Transfer status (only when target_school set)
 */
export interface TemplateValidation {
  isValid: boolean;
  blockedReasons: string[];
  warnings: string[];
  
  // Canonical fit (always computed)
  canonicalFit: {
    complete: boolean;
    satisfied: CanonicalId[];
    missing: CanonicalId[];
  };
  
  // Transfer status (only when target_school set)
  transferStatus?: {
    accepted: boolean;
    electiveOnly: boolean;
    unverified: boolean;
    rejectedCourses: string[];
  };
  
  // Impact deltas
  impact: {
    costDelta: number;
    aceDelta: number;
    weeksDelta: number;
    workloadDelta: number;
    criDelta: number;
  };
}

/**
 * Module-level template
 * Pre-curated degree path at module scope (Cheapest/Fastest/Balanced/Prestige)
 */
export interface ModuleTemplate {
  id: string;
  kind: 'module';
  moduleId: string;
  label: string;
  summary: string;
  badge?: 'Cheapest' | 'Fastest' | 'Balanced' | 'Prestige';
  
  // Options in this template
  options: MarketplaceOption[];
  recommendedCourseId?: string; // Default selection
  
  // Canonical requirement mapping
  targetCanonicalIds: CanonicalId[];
  
  // Optional school targeting
  targetSchool?: string; // If template is school-specific
  transferVerified?: boolean;
  
  // Placement hint for validation
  semesterPlacement?: 'fall' | 'spring' | 'any';
  
  // Estimated totals
  est: {
    costUsd: number;
    weeks: number;
    credits: number;
    cri: number;
    workloadHours: number;
  };
  
  // Generation metadata
  generatedFrom?: 'manual' | 'auto-fill';
  weightProfile?: { cost: number; time: number; cri: number };
  
  // Exploration mode metadata
  explorationMeta?: {
    isExploratory: boolean; // true when module already satisfied
    satisfiedAtGeneration: boolean;
    conflicts?: string[]; // warnings about caps, residency, duplicates
  };
}

/**
 * Year-level template (Phase 2)
 * Pre-curated year of modules
 */
export interface YearTemplate {
  id: string;
  kind: 'year';
  year: number;
  label: string;
  summary: string;
  badge?: string;
  
  // Modules in this year
  moduleTemplates: Array<{
    moduleId: string;
    options: MarketplaceOption[];
    recommendedCourseId?: string;
    targetCanonicalIds: CanonicalId[];
  }>;
  
  targetSchool?: string;
  transferVerified?: boolean;
  
  est: {
    costUsd: number;
    weeks: number;
    credits: number;
    cri: number;
    workloadHours: number;
  };
}

/**
 * Degree-level template (Phase 3)
 * Complete pre-curated degree path
 */
export interface DegreeTemplate {
  id: string;
  kind: 'degree';
  label: string;
  summary: string;
  badge?: string;
  
  yearTemplates: YearTemplate[];
  
  targetSchool?: string;
  transferVerified?: boolean;
  
  est: {
    costUsd: number;
    weeks: number;
    credits: number;
    cri: number;
    workloadHours: number;
  };
}

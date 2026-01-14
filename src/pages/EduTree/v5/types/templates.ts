import type { MarketplaceOption, ProviderType } from './v5';
import type { Optimization } from '@/types/optimizationTypes';

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
    isCapLimited?: boolean; // True when slot was flipped from alt-credit to institutional due to cap
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

/**
 * Marketplace-enhanced degree template (V1)
 * Adds provenance, lifestyle fit, and career outcome metadata
 */
export interface MarketplaceDegreeTemplate extends DegreeTemplate {
  // Core identification (override from base)
  programId: string;
  anchorSchool: string;
  optimization: Optimization;
  
  // Provenance (critical for safety)
  catalogYear: string; // "2025"
  policyVersion: string; // "TESU-2025-v1"
  generatedAt: string; // ISO timestamp
  lastVerified: string; // ISO timestamp
  
  // Marketplace metadata
  marketplace: {
    title: string; // "Fastest Online CS Degree"
    tagline: string; // "Complete in 18 months while working full-time"
    badge?: 'Fastest' | 'Cheapest' | 'Most Popular' | 'Balanced';
    isPremium: boolean; // false for V1 (all free)
  };
  
  // Lifestyle fit
  lifestyle: {
    avgWeeklyHours: number; // 12-15
    paceType: 'accelerated' | 'standard' | 'flexible';
    workCompatible: boolean;
  };
  
  // Career outcomes (link to existing career_paths)
  primaryCareerIds: string[]; // ["software-engineer", "web-developer"]
  
  // Location requirements
  deliveryMode: 'fully_online' | 'hybrid' | 'in_person_required';
  inPersonWeeks?: number; // 0 for fully online
  
  // Social proof (explicit source marking)
  socialProof: {
    popularityScore: number; // 1-5
    dataSource: 'simulated' | 'inferred' | 'actual';
    completionRate?: number; // only if dataSource = 'actual'
  };
  
  // Totals (aggregated from yearTemplates)
  totals: {
    credits: number;
    costUsd: number;
    weeks: number;
    avgCri?: number | null;
  };
  
  // Two-phase timeline data for alt-credit paths
  // Enables transparent display of prep vs enrollment phases
  twoPhaseData?: {
    altCredits: number;
    institutionalCredits: number;
    altCostUsd: number;
    institutionalCostUsd: number;
    planWeeks: number;
  } | null;
  
  // Single-school baseline for savings comparison
  // Shows what the degree would cost if done entirely at the anchor school
  // IMPORTANT: Only populate when you have real pricing data - never fabricate!
  singleSchoolBaseline?: {
    costUsd: number;      // Full cost if all credits at anchor school
    weeks: number;        // Duration if all at anchor school
    source: string;       // "WGU 6-month term pricing" or "TESU per-credit rate"
    notes?: string;       // "Based on 4 terms @ $3,995"
    
    // Year-by-year breakdown for comparison view
    yearBreakdown?: Array<{
      year: number;
      label: string;         // "Year 1 – Foundation"
      credits: number;       // 30
      costUsd: number;       // $3,995
      weeks: number;         // 26
      courseLabel?: string;  // "WGU Term 1 Bundle"
    }>;
  } | null;
  
  // Baseline data quality status (prevents future fabrication regressions)
  // Only render savings UI when status === 'verified'
  baselineStatus?: 'verified' | 'estimated' | 'missing';
  
  // Pricing metadata from institution pricing pack (for data-driven warnings)
  pricingMetadata?: {
    inStateOnly?: boolean;       // If true, show residency warning
    residencyNote?: string;      // Custom note for residency restriction
    sourceUrl?: string;          // Institution pricing source URL
    verifiedAt?: string;         // ISO timestamp of last verification
    model?: 'per_credit' | 'flat_term';  // Pricing model type
  } | null;
  
  // Provider pricing provenance for alt-credit costs
  // Keyed by normalized provider code (SOPHIA, CLEP, STUDYCOM, etc.)
  providerPricing?: Record<string, ProviderPricingInfo> | null;
}

/**
 * Provider pricing pack info for provenance display
 */
export interface ProviderPricingInfo {
  providerCode: string;
  providerName: string;
  sourceUrl?: string;            // Link to provider pricing page
  provenanceVerifiedAt?: string; // ISO timestamp when pricing was verified
  updatedAt?: string;            // ISO timestamp of last database update
  pricingModel?: string;         // 'subscription' | 'per_course' | 'per_exam'
  notes?: string;                // Additional context about pricing
  isEstimated?: boolean;         // True if pricing pack was missing / fallback used
}

/**
 * Marketplace filter state
 */
export interface MarketplaceFilters {
  careerIds: string[];
  budgetRange: [number, number]; // [min, max] in USD
  timeRange: [number, number]; // [min, max] in months
  weeklyHoursRange: [number, number]; // [min, max] hours
  deliveryMode: 'all' | 'fully_online' | 'hybrid' | 'in_person_ok';
  anchorSchools: string[]; // ['TESU', 'WGU', 'UMGC']
  sortBy: 'popularity' | 'cost' | 'time' | 'roi';
}

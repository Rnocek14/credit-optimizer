// TypeScript Contracts - Single Source of Truth for Course Intelligence
// Aligned with ChatGPT Master Spec - Exact Format Required

export type UUID = string;

// Core Reference Types
export interface CIPlatform {
  id: UUID;
  slug: string;
  name: string;
  url?: string;  // Made optional to match spec
}

export interface CIInstructor {
  id: UUID;
  name: string;
  org?: string;
  reputation: number; // 0-5 scale
}

export interface CISkill {
  id: UUID;
  slug: string;
  name: string;
  category?: string;
}

export interface CITrack {
  id: UUID;
  slug: string;
  name: string;
  summary?: string;
}

export interface CICourse {
  id: UUID;
  platform: CIPlatform;
  instructor?: CIInstructor;
  title: string;
  slug: string;
  url?: string;           // Made optional to match spec
  difficulty: number;      // 1-5
  durationHours: number;
}

// Recommendation Types
export interface CIRecoCover {
  skillId: UUID;
  from: number;
  to: number;
  weight: number;
}

export interface CIRecommendation {
  course: CICourse;
  reason: string;
  score: number;             // 0..1
  covers: CIRecoCover[];
  expectedCRIChange: number; // +/-
}

// CRI Types (Master Spec Compliant)
export interface CRIComponent {
  skillId: UUID;
  target: number;
  current: number;
  weight: number;
}

export interface CRIResult {
  success: true;
  userId: UUID;
  trackId: UUID;
  cri: number;                    // Single CRI score (not criBreakdown)
  components: CRIComponent[];
  modelVersion: string;           // Must be "cri:v1"
  computedAt: string;
  cached: boolean;
}

// Recommendation Response Types
export interface RecoResult {
  success: true;
  userId: UUID;
  trackId: UUID;
  recommendations: CIRecommendation[];
  metrics: {
    candidateCount: number;
    selected: number;
    criBefore?: number;
    criAfterEstimate?: number;
  };
  modelVersion: string;
}

// Telemetry Type (Master Spec Compliant)
export interface CITelemetry {
  latency_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  db_reads: number;
  db_writes: number;
  strategy: string;         // Required for telemetry tracking
}

// Request Types
export interface CRIRequest {
  userId: UUID;
  trackId: UUID;
  forceRecompute?: boolean;
}

export interface RecoRequest {
  userId: UUID;
  trackId: UUID;
  limit?: number;
  strategy?: "gap_fill" | "foundations" | "accelerate";
  excludeCourseIds?: UUID[];
}

// Maya Integration Types (Master Spec Compliant)
export interface RecoBundle {
  trackId: UUID;
  cri: number;
  topCourses: Array<{
    courseId: UUID;
    score: number;
    expectedCRIChange: number;
  }>;
  model: {
    cri: "cri:v1";      // Exact version string required
    reco: "reco:v1";    // Exact version string required
  };
}

// Error Response Type
export interface CIErrorResponse {
  success: false;
  error: string;
  details?: any;
}

// Union types for responses
export type CRIResponse = CRIResult | CIErrorResponse;
export type RecoResponse = RecoResult | CIErrorResponse;
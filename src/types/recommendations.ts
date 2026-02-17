export type RecoPriority = 'critical' | 'high' | 'medium' | 'low';

export type RecoType =
  | 'skill_gap'
  | 'maya_action'
  | 'market_alert'
  | 'proof_project';

export interface UnifiedRecommendation {
  id: string;               // stable id
  type: RecoType;
  title: string;            // e.g., "Close SQL gap", "Start Churn Project"
  description: string;      // short, actionable reason
  priority: RecoPriority;
  reason?: string;          // "Boosted by market demand +15%" | "Maya recommends..."
  progress?: number;        // 0-100 if applicable
  timeEstimate?: string;    // e.g., "45 min", "2–3 hrs"
  skills?: string[];        // ['SQL', 'Pandas']
  actions: Array<{
    kind?: string;          // stable discriminator: 'open' | 'save_to_plan' | 'add_to_edutree' | 'navigate'
    label: string;          // e.g., "Find Courses", "Take Next Step"
    href?: string;          // deep link (preferred)
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: Record<string, string | number | boolean>;
    testId?: string;        // for Cypress
  }>;
  createdAt: string;        // ISO
  updatedAt?: string;       // ISO
  // for sorting
  score: number;            // combined priority + market + maya
  // CRI boost properties
  criBoost?: number;        // percentage boost from CRI gaps
  criExplanation?: string;  // explanation of why this is boosted
}

export interface RecommendationFilters {
  type?: RecoType;
  priority?: RecoPriority;
  skills?: string[];
}

export type RecommendationDensity = 'compact' | 'cozy';
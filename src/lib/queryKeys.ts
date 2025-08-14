/**
 * Centralized query keys for React Query cache management
 * Used for consistent invalidation across cross-hub triggers
 */
export const QUERY_KEYS = {
  // User data
  USER_PROFILE: (userId?: string) => ['user-profile', userId],
  USER_XP: (userId?: string) => ['user-xp', userId],
  USER_LEVEL: (userId?: string) => ['user-level', userId],
  
  // Cross-hub integration
  SKILL_GAPS: (userId?: string) => ['skill-gaps', userId],
  UNIFIED_RECOMMENDATIONS: (userId?: string) => ['unified-recommendations', userId],
  
  // Plan data
  PLAN_ITEMS: (userId?: string) => ['plan-items', userId],
  CAREER_GOALS: (userId?: string) => ['career-goals', userId],
  MICRO_GOALS: (userId?: string) => ['micro-goals', userId],
  
  // Progress data
  CELEBRATION_MOMENTS: (userId?: string) => ['celebration-moments', userId],
  COMPLETION_TRIGGERS: (userId?: string) => ['completion-triggers', userId],
  LEARNING_STREAKS: (userId?: string) => ['learning-streaks', userId],
  
  // Gamification
  GAMIFICATION_DATA: (userId?: string) => ['gamification-data', userId],
  
  // Feed data
  SMART_DASHBOARD: (userId?: string) => ['smart-dashboard', userId],
  
  // Analytics
  ANALYTICS_EVENTS: (userId?: string) => ['analytics-events', userId],
} as const;

export type QueryKey = keyof typeof QUERY_KEYS;
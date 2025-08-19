/**
 * Centralized query keys for React Query cache management
 * Used for consistent invalidation across cross-hub triggers with track awareness
 */
export const QUERY_KEYS = {
  // User data
  USER_PROFILE: (userId?: string) => ['user-profile', userId],
  USER_XP: (userId?: string) => ['user-xp', userId],
  USER_LEVEL: (userId?: string) => ['user-level', userId],
  
  // Track-aware data
  CAREER_TRACKS: (userId?: string) => ['career-tracks', userId],
  COURSE_PROGRESS: (userId?: string, trackId?: string) => ['course-progress', userId, trackId],
  LEARNING_MILESTONES: (userId?: string, trackId?: string) => ['learning-milestones', userId, trackId],
  USER_TRACK_XP: (userId?: string, trackId?: string) => ['user-track-xp', userId, trackId],
  USER_TRACK_XP_EVENTS: (userId?: string, trackId?: string) => ['user-track-xp-events', userId, trackId],
  AUTONOMOUS_WORKFLOWS: (userId?: string, trackId?: string) => ['autonomous-workflows', userId, trackId],
  
  // Cross-hub integration (track-aware)
  SKILL_GAPS: (userId?: string, trackId?: string) => ['skill-gaps', userId, trackId],
  UNIFIED_RECOMMENDATIONS: (userId?: string, trackId?: string) => ['unified-recommendations', userId, trackId],
  
  // Plan data (track-aware)
  PLAN_ITEMS: (userId?: string, trackId?: string) => ['plan-items', userId, trackId],
  CAREER_GOALS: (userId?: string, trackId?: string) => ['career-goals', userId, trackId],
  MICRO_GOALS: (userId?: string, trackId?: string) => ['micro-goals', userId, trackId],
  
  // Progress data (track-aware)
  CELEBRATION_MOMENTS: (userId?: string, trackId?: string) => ['celebration-moments', userId, trackId],
  COMPLETION_TRIGGERS: (userId?: string, trackId?: string) => ['completion-triggers', userId, trackId],
  LEARNING_STREAKS: (userId?: string, trackId?: string) => ['learning-streaks', userId, trackId],
  
  // Gamification (track-aware)
  GAMIFICATION_DATA: (userId?: string, trackId?: string) => ['gamification-data', userId, trackId],
  
  // Feed data (track-aware)
  SMART_DASHBOARD: (userId?: string, trackId?: string) => ['smart-dashboard', userId, trackId],
  
  // Analytics (track-aware)
  ANALYTICS_EVENTS: (userId?: string, trackId?: string) => ['analytics-events', userId, trackId],
} as const;

export type QueryKey = keyof typeof QUERY_KEYS;
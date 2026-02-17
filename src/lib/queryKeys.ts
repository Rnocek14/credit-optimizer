/**
 * Centralized query keys for React Query cache management
 * Used for consistent invalidation across cross-hub triggers with track awareness
 *
 * Convention: keys are namespaced by feature domain to prevent collisions.
 * e.g. ['edutree', 'edu-courses'] not ['edu-courses']
 */
export const QUERY_KEYS = {
  // User data
  USER_PROFILE: (userId?: string) => ['user-profile', userId],
  USER_XP: (userId?: string, trackId?: string) => ['user-xp', userId, trackId],
  USER_LEVEL: (userId?: string, trackId?: string) => ['user-level', userId, trackId],
  
  // ── EduTree ───────────────────────────────────────────────────
  EDU_COURSES: () => ['edutree', 'edu-courses'] as const,
  REQUIREMENT_BLOCKS: () => ['edutree', 'requirement-blocks'] as const,
  BLOCK_MEMBERS: () => ['edutree', 'block-members'] as const,
  BLOCK_GATES: () => ['edutree', 'block-gates'] as const,
  GATE_EDGES: () => ['edutree', 'prereq-to-block'] as const,
  CAREER_V5_DATA: (programId: string, anchorSchool: string) => ['edutree', 'career-v5-data', programId, anchorSchool] as const,
  BATCH_REQUIREMENT_OPTIONS: (requirementIds: string[]) => ['edutree', 'req-opt-batch', ...requirementIds.sort()] as const,
  USER_PLAN_SELECTIONS: (planId?: string) => ['edutree', 'user-plan-selections', planId] as const,
  USER_PLAN_COURSES: (planId?: string) => ['edutree', 'user-plan-courses', planId] as const,
  
  // ── Track-aware data ──────────────────────────────────────────
  COURSE_PROGRESS: (userId?: string, trackId?: string) => ['progress', 'course-progress', userId, trackId],
  COURSE_HISTORY: (userId?: string, trackId?: string) => ['progress', 'course-history', userId, trackId],
  LEARNING_MILESTONES: (userId?: string, trackId?: string) => ['progress', 'learning-milestones', userId, trackId],
  USER_TRACK_XP: (userId?: string, trackId?: string) => ['progress', 'user-track-xp', userId, trackId],
  USER_TRACK_XP_EVENTS: (userId?: string, trackId?: string) => ['progress', 'user-track-xp-events', userId, trackId],
  AUTONOMOUS_WORKFLOWS: (userId?: string, trackId?: string) => ['progress', 'autonomous-workflows', userId, trackId],
  
  // ── Cross-hub integration (track-aware) ───────────────────────
  SKILL_GAPS: (userId?: string, trackId?: string) => ['crosshub', 'skill-gaps', userId, trackId],
  UNIFIED_RECOMMENDATIONS: (userId?: string, trackId?: string) => ['crosshub', 'unified-recommendations', userId, trackId],
  
  // ── Plan data (track-aware) ───────────────────────────────────
  PLAN_ITEMS: (userId?: string, trackId?: string) => ['plan', 'plan-items', userId, trackId],
  CAREER_GOALS: (userId?: string, trackId?: string) => ['plan', 'career-goals', userId, trackId],
  MICRO_GOALS: (userId?: string, trackId?: string) => ['plan', 'micro-goals', userId, trackId],
  
  // ── Progress data (track-aware) ───────────────────────────────
  CELEBRATION_MOMENTS: (userId?: string, trackId?: string) => ['gamification', 'celebration-moments', userId, trackId],
  COMPLETION_TRIGGERS: (userId?: string, trackId?: string) => ['gamification', 'completion-triggers', userId, trackId],
  LEARNING_STREAKS: (userId?: string, trackId?: string) => ['gamification', 'learning-streaks', userId, trackId],
  
  // ── Gamification (track-aware) ────────────────────────────────
  GAMIFICATION_DATA: (userId?: string, trackId?: string) => ['gamification', 'gamification-data', userId, trackId],
  
  // ── Feed data (track-aware) ───────────────────────────────────
  SMART_DASHBOARD: (userId?: string, trackId?: string) => ['feed', 'smart-dashboard', userId, trackId],
  
  // ── Analytics (track-aware) ───────────────────────────────────
  ANALYTICS_EVENTS: (userId?: string, trackId?: string) => ['analytics', 'analytics-events', userId, trackId],

  // ── Multi-institution data ────────────────────────────────────
  INSTITUTIONS: () => ['institutions', 'list'],
  TEACHERS: (institutionId?: string) => ['institutions', 'teachers', institutionId],
  TEACHERS_TOP: (limit = 10) => ['institutions', 'teachers-top', limit],
  ENHANCED_TRANSCRIPTS: (userId?: string, trackId?: string) => ['institutions', 'enhanced-transcripts', userId, trackId],
  USER_TEACHER_RATINGS: (userId?: string, teacherId?: string) => ['institutions', 'user-teacher-ratings', userId, teacherId],
  
  // ── Phase 6: Path Canvas & Provider system ────────────────────
  PROVIDER_ALTERNATES: (skillTags?: string[], difficulty?: string, estimatedHours?: number) => 
    ['providers', 'provider-alternates', skillTags, difficulty, estimatedHours] as const,
  CAREER_TRACKS: (userId?: string) => ['providers', 'career-tracks', userId] as const,

  // ── Course-aware nodes: batched options and transfer rules ────
  requirementOptionsBatch: (blockIds: string[], scope: string) =>
    ['edutree', 'requirement-options-batch', scope, ...blockIds.sort()] as const,
  transferRulesBatch: (blockIds: string[], scope: string) =>
    ['edutree', 'transfer-rules-batch', scope, ...blockIds.sort()] as const,
  courseEquivalencies: (courseIds: string[]) =>
    ['edutree', 'course-equivalencies', ...courseIds.sort()] as const,
} as const;

export type QueryKey = keyof typeof QUERY_KEYS;

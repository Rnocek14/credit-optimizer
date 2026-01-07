/**
 * CONSOLIDATED PLAN STORE
 * 
 * This file re-exports the unified plan store from EduTree V5.
 * All plan state (legacy addedCourses + V5 selections/semesters) is now in one place.
 * 
 * @deprecated Import directly from '@/pages/EduTree/v5/state/usePlanStore' for new code.
 */

export { usePlanStore, type CourseLite } from '@/pages/EduTree/v5/state/usePlanStore';

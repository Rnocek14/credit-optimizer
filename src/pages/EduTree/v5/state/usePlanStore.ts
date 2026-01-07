import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============ LEGACY TYPES (from src/state/planStore.ts) ============
export interface CourseLite {
  id?: string;
  title: string;
  provider?: string;
  url?: string;
}

// ============ V5 TYPES ============
type Selection = Record<string, { // requirementId -> selected courseIds
  selected: string[]
  selectedCredits: number
}>

// Phase 2: Semester state
type SemesterState = Record<string, { // semesterId -> placed courses
  courseIds: string[]
  credits: number
  workloadHours: number
}>

type Actions = {
  // V5 actions
  toggleCourse: (requirementId: string, courseId: string, courseCredits: number, maxCredits: number) => void
  clearRequirement: (requirementId: string) => void
  clearAll: () => void
  addCourseToSemester: (semesterId: string, courseId: string, credits: number) => void
  removeCourseFromSemester: (semesterId: string, courseId: string) => void
  clearYear: (year: number) => void
  // Legacy actions (from src/state/planStore.ts)
  addCourseToPlan: (course: CourseLite) => void
  clear: () => void
}

type State = {
  // V5 state
  selections: Selection
  semesters: SemesterState
  // Legacy state (from src/state/planStore.ts)
  addedCourses: CourseLite[]
} & Actions

export const usePlanStore = create<State>()(persist(
  (set, get) => ({
    // V5 state
    selections: {},
    semesters: {},
    // Legacy state
    addedCourses: [],
    
    // V5 actions
    toggleCourse: (reqId, courseId, courseCredits, maxCredits) => {
      const s = structuredClone(get().selections)
      const entry = s[reqId] ?? { selected: [], selectedCredits: 0 }
      const idx = entry.selected.indexOf(courseId)

      if (idx >= 0) {
        // unselect
        entry.selected.splice(idx, 1)
        entry.selectedCredits = Math.max(0, entry.selectedCredits - courseCredits)
      } else {
        // selecting: respect maxCredits
        if (entry.selectedCredits + courseCredits > maxCredits) {
          // disallow over-selection
          return
        }
        entry.selected.push(courseId)
        entry.selectedCredits += courseCredits
      }

      s[reqId] = entry
      set({ selections: s })
    },
    clearRequirement: (reqId) => {
      const s = structuredClone(get().selections)
      delete s[reqId]
      set({ selections: s })
    },
    clearAll: () => {
      set({ selections: {}, semesters: {}, addedCourses: [] })
    },
    addCourseToSemester: (semesterId, courseId, credits) => {
      const semesters = structuredClone(get().semesters)
      const sem = semesters[semesterId] ?? { courseIds: [], credits: 0, workloadHours: 0 }
      
      if (!sem.courseIds.includes(courseId)) {
        sem.courseIds.push(courseId)
        sem.credits += credits
        // Estimate 3 hours per credit as default
        sem.workloadHours += credits * 3
      }
      
      semesters[semesterId] = sem
      set({ semesters })
    },
    removeCourseFromSemester: (semesterId, courseId) => {
      const semesters = structuredClone(get().semesters)
      const sem = semesters[semesterId]
      
      if (sem) {
        const idx = sem.courseIds.indexOf(courseId)
        if (idx >= 0) {
          sem.courseIds.splice(idx, 1)
          // Recalculate would need course details; for now just clear if empty
          if (sem.courseIds.length === 0) {
            delete semesters[semesterId]
          }
        }
      }
      
      set({ semesters })
    },
    clearYear: (year) => {
      const semesters = structuredClone(get().semesters)
      // Support fall, spring, and summer terms
      const keysToDelete = [`${year}-fall`, `${year}-spring`, `${year}-summer`]
      
      keysToDelete.forEach(key => {
        delete semesters[key]
      })
      
      set({ semesters })
    },
    
    // Legacy actions
    addCourseToPlan: (course) => set((state) => ({ 
      addedCourses: [course, ...state.addedCourses] 
    })),
    clear: () => set({ addedCourses: [] }),
  }),
  { name: 'v5-plan' }
))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  toggleCourse: (requirementId: string, courseId: string, courseCredits: number, maxCredits: number) => void
  clearRequirement: (requirementId: string) => void
  clearAll: () => void
  addCourseToSemester: (semesterId: string, courseId: string, credits: number) => void
  removeCourseFromSemester: (semesterId: string, courseId: string) => void
}

type State = {
  selections: Selection
  semesters: SemesterState
} & Actions

export const usePlanStore = create<State>()(persist(
  (set, get) => ({
    selections: {},
    semesters: {},
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
      set({ selections: {}, semesters: {} })
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
  }),
  { name: 'v5-plan' }
))

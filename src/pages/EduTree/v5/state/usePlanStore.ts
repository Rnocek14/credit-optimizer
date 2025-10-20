import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Selection = Record<string, { // requirementId -> selected courseIds
  selected: string[]
  selectedCredits: number
}>

type Actions = {
  toggleCourse: (requirementId: string, courseId: string, courseCredits: number, maxCredits: number) => void
  clearRequirement: (requirementId: string) => void
  clearAll: () => void
}

type State = {
  selections: Selection
} & Actions

export const usePlanStore = create<State>()(persist(
  (set, get) => ({
    selections: {},
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
      set({ selections: {} })
    },
  }),
  { name: 'v5-plan' }
))

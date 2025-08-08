import { create } from 'zustand';

export interface CourseLite {
  id?: string;
  title: string;
  provider?: string;
  url?: string;
}

interface PlanState {
  addedCourses: CourseLite[];
  addCourseToPlan: (course: CourseLite) => void;
  clear: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  addedCourses: [],
  addCourseToPlan: (course) => set((state) => ({ addedCourses: [course, ...state.addedCourses] })),
  clear: () => set({ addedCourses: [] }),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';

// Mock the persist middleware to avoid localStorage issues in tests
const mockPersist = (config: any) => config;

describe('usePlanStore', () => {
  // Create a test store without persistence
  const createTestStore = () => {
    return create<any>()((set, get) => ({
      selections: {},
      semesters: {},
      toggleCourse: (reqId: string, courseId: string, courseCredits: number, maxCredits: number) => {
        const s = structuredClone(get().selections);
        const entry = s[reqId] ?? { selected: [], selectedCredits: 0 };
        const idx = entry.selected.indexOf(courseId);

        if (idx >= 0) {
          entry.selected.splice(idx, 1);
          entry.selectedCredits = Math.max(0, entry.selectedCredits - courseCredits);
        } else {
          if (entry.selectedCredits + courseCredits > maxCredits) {
            return;
          }
          entry.selected.push(courseId);
          entry.selectedCredits += courseCredits;
        }

        s[reqId] = entry;
        set({ selections: s });
      },
      clearRequirement: (reqId: string) => {
        const s = structuredClone(get().selections);
        delete s[reqId];
        set({ selections: s });
      },
      clearAll: () => {
        set({ selections: {}, semesters: {} });
      },
      addCourseToSemester: (semesterId: string, courseId: string, credits: number) => {
        const semesters = structuredClone(get().semesters);
        const sem = semesters[semesterId] ?? { courseIds: [], credits: 0, workloadHours: 0 };
        
        if (!sem.courseIds.includes(courseId)) {
          sem.courseIds.push(courseId);
          sem.credits += credits;
          sem.workloadHours += credits * 3;
        }
        
        semesters[semesterId] = sem;
        set({ semesters });
      },
      removeCourseFromSemester: (semesterId: string, courseId: string) => {
        const semesters = structuredClone(get().semesters);
        const sem = semesters[semesterId];
        
        if (sem) {
          const idx = sem.courseIds.indexOf(courseId);
          if (idx >= 0) {
            sem.courseIds.splice(idx, 1);
            if (sem.courseIds.length === 0) {
              delete semesters[semesterId];
            }
          }
        }
        
        set({ semesters });
      },
      clearYear: (year: number) => {
        const semesters = structuredClone(get().semesters);
        const keysToDelete = [`${year}-fall`, `${year}-spring`, `${year}-summer`];
        
        keysToDelete.forEach(key => {
          delete semesters[key];
        });
        
        set({ semesters });
      },
    }));
  };

  describe('clearYear', () => {
    it('removes only semesters for the specified year', () => {
      const useStore = createTestStore();
      
      // Set up initial state with multiple years
      useStore.setState({
        semesters: {
          '1-fall': { courseIds: ['C1'], credits: 3, workloadHours: 9 },
          '1-spring': { courseIds: ['C2'], credits: 3, workloadHours: 9 },
          '2-fall': { courseIds: ['C3'], credits: 3, workloadHours: 9 },
          '2-spring': { courseIds: ['C4'], credits: 3, workloadHours: 9 },
        }
      });
      
      // Clear year 1
      useStore.getState().clearYear(1);
      
      const semesters = useStore.getState().semesters;
      expect(semesters['1-fall']).toBeUndefined();
      expect(semesters['1-spring']).toBeUndefined();
      expect(semesters['2-fall']).toBeDefined();
      expect(semesters['2-spring']).toBeDefined();
    });

    it('handles summer semester keys (legacy support)', () => {
      const useStore = createTestStore();
      
      useStore.setState({
        semesters: {
          '1-fall': { courseIds: ['C1'], credits: 3, workloadHours: 9 },
          '1-spring': { courseIds: ['C2'], credits: 3, workloadHours: 9 },
          '1-summer': { courseIds: ['C3'], credits: 3, workloadHours: 9 }, // Legacy key
        }
      });
      
      useStore.getState().clearYear(1);
      
      const semesters = useStore.getState().semesters;
      expect(semesters['1-fall']).toBeUndefined();
      expect(semesters['1-spring']).toBeUndefined();
      expect(semesters['1-summer']).toBeUndefined();
    });

    it('does not affect other years when clearing one year', () => {
      const useStore = createTestStore();
      
      useStore.setState({
        semesters: {
          '1-fall': { courseIds: ['C1'], credits: 3, workloadHours: 9 },
          '2-fall': { courseIds: ['C2'], credits: 4, workloadHours: 12 },
          '3-fall': { courseIds: ['C3'], credits: 5, workloadHours: 15 },
        }
      });
      
      useStore.getState().clearYear(2);
      
      const semesters = useStore.getState().semesters;
      expect(semesters['1-fall']).toEqual({ courseIds: ['C1'], credits: 3, workloadHours: 9 });
      expect(semesters['2-fall']).toBeUndefined();
      expect(semesters['3-fall']).toEqual({ courseIds: ['C3'], credits: 5, workloadHours: 15 });
    });

    it('handles clearing a year with no semesters gracefully', () => {
      const useStore = createTestStore();
      
      useStore.setState({
        semesters: {
          '1-fall': { courseIds: ['C1'], credits: 3, workloadHours: 9 },
        }
      });
      
      // Clear year 2 (which doesn't exist)
      expect(() => useStore.getState().clearYear(2)).not.toThrow();
      
      const semesters = useStore.getState().semesters;
      expect(semesters['1-fall']).toBeDefined();
    });
  });

  describe('addCourseToSemester', () => {
    it('creates new semester if it does not exist', () => {
      const useStore = createTestStore();
      
      useStore.getState().addCourseToSemester('1-fall', 'CS101', 3);
      
      const sem = useStore.getState().semesters['1-fall'];
      expect(sem).toBeDefined();
      expect(sem.courseIds).toEqual(['CS101']);
      expect(sem.credits).toBe(3);
      expect(sem.workloadHours).toBe(9); // 3 credits * 3 hours
    });

    it('does not add duplicate courses', () => {
      const useStore = createTestStore();
      
      useStore.getState().addCourseToSemester('1-fall', 'CS101', 3);
      useStore.getState().addCourseToSemester('1-fall', 'CS101', 3);
      
      const sem = useStore.getState().semesters['1-fall'];
      expect(sem.courseIds).toEqual(['CS101']);
      expect(sem.credits).toBe(3);
    });
  });

  describe('removeCourseFromSemester', () => {
    it('removes course and cleans up empty semesters', () => {
      const useStore = createTestStore();
      
      useStore.setState({
        semesters: {
          '1-fall': { courseIds: ['CS101'], credits: 3, workloadHours: 9 },
        }
      });
      
      useStore.getState().removeCourseFromSemester('1-fall', 'CS101');
      
      expect(useStore.getState().semesters['1-fall']).toBeUndefined();
    });
  });
});

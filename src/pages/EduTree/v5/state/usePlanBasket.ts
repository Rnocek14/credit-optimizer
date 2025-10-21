import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Phase 1a: BasketItem with ACE Credit Tracking
 * - providerType determines if credits count toward ACE/NCCRS transfer cap
 * - Only 'mooc' and 'testing_center' count as alternative credit
 * - Migration guard ensures old items without providerType default to null
 */
export interface BasketItem {
  moduleId: string;
  courseId: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  workload_weekly_hours: number;
  cri_score: number;
  status: 'pinned' | 'auto-filled';
  providerType?: 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null;
}

/**
 * Phase 1a: Constraints with Concurrency Support
 * - max_concurrent_courses (default 2) simulates realistic parallelization
 * - Used in deadline violations and timeline calculations
 */
export interface Constraints {
  max_budget_usd?: number;
  target_graduation_date?: Date;
  max_weekly_hours?: number;
  min_cri_score?: number;
  max_ace_credits?: number; // transfer cap
  max_concurrent_courses?: number; // for realistic deadline math
}

interface PlanBasketState {
  items: BasketItem[];
  constraints: Constraints;
  scenarios: Record<string, { items: BasketItem[]; constraints: Constraints }>;
  
  // Actions
  addItem: (item: BasketItem) => void;
  removeItem: (courseId: string) => void;
  setConstraints: (c: Partial<Constraints>) => void;
  
  // Scenarios (Phase 2 prep)
  saveScenario: (name: string) => void;
  loadScenario: (name: string) => void;
  clearAll: () => void;
  
  // Computed
  getTotals: () => {
    totalCost: number;
    totalWeeks: number;
    avgCRI: number;
    totalWorkloadHours: number;
    aceCredits: number;
  };
}

/**
 * Migration helper: backfill missing fields from Phase 1a
 */
const migrateBasketItems = (items: BasketItem[]): BasketItem[] => {
  return items.map(item => ({
    ...item,
    providerType: item.providerType ?? null,
    workload_weekly_hours: item.workload_weekly_hours ?? (item.credits * 2.5)
  }));
};

export const usePlanBasket = create<PlanBasketState>()(
  persist(
    (set, get) => ({
      items: [],
      constraints: {
        max_ace_credits: 90, // default WGU-style cap
        max_concurrent_courses: 2, // default: 2 courses at a time
      },
      scenarios: {},
      
      addItem: (item) => {
        const items = get().items;
        // Prevent duplicates
        if (items.some(i => i.courseId === item.courseId)) {
          return;
        }
        set({ items: [...items, item] });
      },
      
      removeItem: (courseId) => {
        set({ items: get().items.filter(i => i.courseId !== courseId) });
      },
      
      setConstraints: (c) => {
        set({ constraints: { ...get().constraints, ...c } });
      },
      
      saveScenario: (name) => {
        const { items, constraints, scenarios } = get();
        set({
          scenarios: {
            ...scenarios,
            [name]: { items: [...items], constraints: { ...constraints } }
          }
        });
      },
      
      loadScenario: (name) => {
        const scenario = get().scenarios[name];
        if (scenario) {
          set({
            items: [...scenario.items],
            constraints: { ...scenario.constraints }
          });
        }
      },
      
      clearAll: () => {
        set({ items: [] });
      },
      
      getTotals: () => {
        const items = get().items;
        const constraints = get().constraints;
        
        if (items.length === 0) {
          return {
            totalCost: 0,
            totalWeeks: 0,
            avgCRI: 0,
            totalWorkloadHours: 0,
            aceCredits: 0
          };
        }
        
        const totalCost = items.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
        
        // Calculate realistic weeks using concurrency
        const concurrency = constraints.max_concurrent_courses ?? 2;
        const serialWeeks = items.reduce((sum, i) => sum + (i.duration_weeks ?? 8), 0);
        const totalWeeks = Math.ceil(serialWeeks / concurrency);
        
        const totalCRI = items.reduce((sum, i) => sum + i.cri_score, 0);
        const avgCRI = totalCRI / items.length;
        
        // Phase 1a: Workload Totals (Not Averages) - guard against undefined
        const totalWorkloadHours = items.reduce((sum, i) => sum + (i.workload_weekly_hours ?? 0), 0);
        
        // Phase 1a: ACE Credit Tracking - only MOOCs and testing centers count
        const aceCredits = items
          .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
          .reduce((sum, i) => sum + i.credits, 0);
        
        return {
          totalCost,
          totalWeeks,
          avgCRI,
          totalWorkloadHours,
          aceCredits
        };
      }
    }),
    { 
      name: 'v5-plan-basket',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrate from v0 to v1: backfill providerType and workload_weekly_hours
          return {
            ...persistedState,
            items: migrateBasketItems(persistedState.items || [])
          };
        }
        return persistedState;
      }
    }
  )
);

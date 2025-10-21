import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderType } from '../types/v5';

/**
 * Phase 1a: BasketItem with ACE Credit Tracking
 * - providerType determines if credits count toward ACE/NCCRS transfer cap
 * - Only 'mooc' and 'testing_center' count as alternative credit
 * - Migration guard ensures old items without providerType default to null
 */
export interface BasketItem {
  moduleId: string;
  courseId: string;
  title?: string; // Phase 1c: optional title for display
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  workload_weekly_hours: number;
  cri_score: number;
  status: 'pinned' | 'auto-filled';
  providerType?: ProviderType;
  autoFillReason?: string; // Phase 1b: inline reasoning for auto-filled items
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
        
        // Phase 1c: Use shared totals calculator (single source of truth)
        const { calculateTotals } = require('../utils/totalsCalculator');
        return calculateTotals(items, constraints);
      }
    }),
    { 
      name: 'v5-plan-basket',
      // Schema versions:
      // v1 = providerType + workload_weekly_hours
      // v2 = adds optional autoFillReason (no migration needed - optional field)
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrate from v0 to v1: backfill providerType and workload_weekly_hours
          return {
            ...persistedState,
            items: migrateBasketItems(persistedState.items || [])
          };
        }
        // v1 → v2: no action needed (autoFillReason is optional)
        return persistedState;
      }
    }
  )
);

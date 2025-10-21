import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderType, PlanScenario } from '../types/v5';
import { calculateTotals } from '../utils/totalsCalculator';
import { trackTelemetryEvent } from '@/utils/telemetry';

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
  scenarios: PlanScenario[];
  
  // Actions
  addItem: (item: BasketItem) => void;
  removeItem: (courseId: string) => void;
  setConstraints: (c: Partial<Constraints>) => void;
  
  // Scenarios
  saveScenario: (name: string) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
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

const CAP = 20;

export const usePlanBasket = create<PlanBasketState>()(
  persist(
    (set, get) => ({
      items: [],
      constraints: {
        max_ace_credits: 90, // default WGU-style cap
        max_concurrent_courses: 2, // default: 2 courses at a time
      },
      scenarios: [],
      
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
        const snapshotItems = items.map(i => ({ ...i }));
        const snapshotConstraints = { ...constraints };
        const totals = calculateTotals(snapshotItems, snapshotConstraints);

        const scenario: PlanScenario = {
          id: crypto.randomUUID(),
          name: name?.trim() || `Plan – ${new Date().toLocaleDateString()}`,
          version: 3,
          createdAt: new Date().toISOString(),
          items: snapshotItems,
          constraints: snapshotConstraints,
          totals,
        };

        const next = [scenario, ...scenarios].slice(0, CAP);
        set({ scenarios: next });

        void trackTelemetryEvent({
          task: 'scenario_saved',
          scope: 'plan',
          complexity: {
            itemsCount: snapshotItems.length,
            totalCost: totals.totalCost,
            scenarioCount: next.length,
          },
        });

        return scenario.id;
      },
      
      loadScenario: (id) => {
        const s = get().scenarios.find(x => x.id === id);
        if (!s) {
          console.warn(`Scenario ${id} not found`);
          return;
        }
        set({
          items: s.items.map(i => ({ ...i })),
          constraints: { ...s.constraints },
        });

        void trackTelemetryEvent({
          task: 'scenario_loaded',
          scope: 'plan',
          complexity: {
            itemsCount: s.items.length,
            totalCost: s.totals.totalCost,
          },
        });
      },
      
      deleteScenario: (id) => {
        const next = get().scenarios.filter(s => s.id !== id);
        set({ scenarios: next });

        void trackTelemetryEvent({
          task: 'scenario_deleted',
          scope: 'plan',
          complexity: { remainingCount: next.length },
        });
      },
      
      clearAll: () => {
        set({ items: [] });
      },
      
      getTotals: () => {
        const items = get().items;
        const constraints = get().constraints;
        
        // Phase 1c: Use shared totals calculator (single source of truth)
        return calculateTotals(items, constraints);
      }
    }),
    { 
      name: 'v5-plan-basket',
      // Schema versions:
      // v1 = providerType + workload_weekly_hours
      // v2 = adds optional autoFillReason (no migration needed - optional field)
      // v3 = scenarios: Record → PlanScenario[] with cap enforcement
      version: 3,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState ?? {};
        
        if (version === 0) {
          // Migrate from v0 to v1: backfill providerType and workload_weekly_hours
          state = {
            ...state,
            items: migrateBasketItems(state.items || [])
          };
        }
        
        // v2 → v3: Convert Record → PlanScenario[]
        if (version < 3) {
          const old = state.scenarios ?? {};
          const entries = Object.entries(old) as [string, any][];

          const newScenarios: PlanScenario[] = entries.map(([name, data]) => {
            const items = migrateBasketItems(data?.items ?? []);
            const constraints = { ...(data?.constraints ?? {}) };
            const totals = calculateTotals(items, constraints);
            return {
              id: crypto.randomUUID(),
              name,
              version: 3,
              createdAt: new Date().toISOString(),
              items,
              constraints,
              totals,
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, CAP);

          state = { ...state, scenarios: newScenarios };
        }

        return state;
      }
    }
  )
);

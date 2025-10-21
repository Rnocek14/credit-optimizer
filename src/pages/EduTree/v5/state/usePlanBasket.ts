import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BasketItem {
  moduleId: string;
  courseId: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  workload_weekly_hours: number;
  cri_score: number;
  status: 'pinned' | 'auto-filled';
}

export interface Constraints {
  max_budget_usd?: number;
  target_graduation_date?: Date;
  max_weekly_hours?: number;
  min_cri_score?: number;
  max_ace_credits?: number; // transfer cap
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

export const usePlanBasket = create<PlanBasketState>()(
  persist(
    (set, get) => ({
      items: [],
      constraints: {
        max_ace_credits: 90, // default WGU-style cap
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
        const totalWeeks = items.reduce((sum, i) => sum + (i.duration_weeks ?? 8), 0);
        const totalCRI = items.reduce((sum, i) => sum + i.cri_score, 0);
        const avgCRI = totalCRI / items.length;
        const totalWorkloadHours = items.reduce((sum, i) => sum + i.workload_weekly_hours, 0);
        
        // For now, assume all MOOCs/testing are ACE credits
        // In real implementation, would check provider type from metadata
        const aceCredits = 0; // Placeholder - will be calculated with provider data
        
        return {
          totalCost,
          totalWeeks,
          avgCRI,
          totalWorkloadHours,
          aceCredits
        };
      }
    }),
    { name: 'v5-plan-basket' }
  )
);

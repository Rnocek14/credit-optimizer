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
  title?: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  workload_weekly_hours: number;
  cri_score: number;
  status: 'pinned' | 'auto-filled' | 'prereq';
  providerType?: ProviderType;
  providerCode?: string;
  level?: number;
  semester?: 'fall' | 'spring' | 'summer'; // Week 1.5: Track semester assignment for DnD
  
  // Structured provenance (replaces autoFillReason string parsing)
  source?: {
    type: 'template' | 'manual' | 'prereq';
    templateId?: string;
    templateVersion?: number;
    templateLabel?: string;
  };
  
  /** @deprecated Keep for backward compatibility */
  autoFillReason?: string;
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
  target_school?: string; // Phase 0-2: anchor school for transfer policy tracking
}

// Per-module template tracking
export interface ModuleState {
  templateId?: string;
  templateVersion?: number;
  templateLabel?: string;
  appliedAt?: string;
  originalCourseIds?: string[];
}

interface PlanBasketState {
  items: BasketItem[];
  constraints: Constraints;
  scenarios: PlanScenario[];
  moduleStates: Record<string, ModuleState>;
  
  // Actions
  addItem: (item: BasketItem) => void;
  removeItem: (courseId: string) => void;
  removeItemsByModuleIds: (moduleIds: string[]) => void;
  setConstraints: (c: Partial<Constraints>) => void;
  
  // Module state tracking
  setModuleState: (moduleId: string, state: ModuleState) => void;
  clearModuleState: (moduleId: string) => void;
  isModuleModified: (moduleId: string) => boolean;
  
  // Pin/Unpin operations
  pinAllItems: (moduleId: string) => void;
  unpinAllItems: (moduleId: string) => void;
  
  // Scenarios
  saveScenario: (name: string) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  clearAll: () => void;
  
  // Template hydration
  applyTemplateToPlan: (template: any) => void;
  
  // Computed
  getTotals: () => {
    totalCost: number;
    totalWeeks: number;
    avgCRI: number;
    totalWorkloadHours: number;
    aceCredits: number;
  };
  
  // Memoized selectors
  selectModuleItems: (moduleId: string) => BasketItem[];
  selectModuleViewState: (moduleId: string) => 'empty' | 'template-intact' | 'modified' | 'custom';
}

/**
 * Migration helper: backfill missing fields and structured provenance
 */
const migrateBasketItems = (items: BasketItem[]): BasketItem[] => {
  return items.map(item => {
    const migrated = {
      ...item,
      providerType: item.providerType ?? null,
      // Align with marketplace defaults: (credits × 45hrs) / duration or 3hrs/week fallback
      workload_weekly_hours: item.workload_weekly_hours ?? 
        (item.duration_weeks ? (item.credits * 45) / item.duration_weeks : item.credits * 3)
    };
    
    // Backfill structured source from legacy autoFillReason
    if (!migrated.source && (migrated.status || migrated.autoFillReason)) {
      if (migrated.status === 'prereq') {
        migrated.source = { type: 'prereq' as const };
      } else if (migrated.autoFillReason?.includes('From template:')) {
        // Best-effort extraction: "From template: found-cheapest" → templateId
        const match = migrated.autoFillReason.match(/From template:\s*(\S+)/);
        migrated.source = {
          type: 'template' as const,
          templateId: match?.[1] || 'unknown',
          templateVersion: 1,
        };
      } else {
        migrated.source = { type: 'manual' as const };
      }
    }
    
    return migrated;
  });
};

/**
 * Helper: Extract template label from templateId
 * Examples: "found-cheapest" → "Cheapest", "found-fastest" → "Fastest"
 */
const inferTemplateLabel = (templateId?: string): string | undefined => {
  if (!templateId) return undefined;
  const match = templateId.match(/found-(\w+)/);
  if (!match) return undefined;
  const label = match[1];
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const CAP = 20;

export const usePlanBasket = create<PlanBasketState>()(
  persist(
    (set, get) => ({
      items: [],
      constraints: {
        max_ace_credits: 90,
        max_concurrent_courses: 2,
      },
      scenarios: [],
      moduleStates: {},
      
      addItem: (item) => {
        const items = get().items;
        // Prevent duplicates within same module + semester (allow course to satisfy different modules)
        const isDuplicate = items.some(i => 
          i.courseId === item.courseId && 
          i.moduleId === item.moduleId &&
          (!item.semester || !i.semester || i.semester === item.semester)
        );
        if (isDuplicate) {
          console.warn('[Basket] Duplicate prevented:', item.courseId, item.moduleId, item.semester);
          return;
        }
        set({ items: [...items, item] });
      },
      
      removeItem: (courseId) => {
        set({ items: get().items.filter(i => i.courseId !== courseId) });
      },
      
      removeItemsByModuleIds: (moduleIds) => {
        const moduleIdSet = new Set(moduleIds);
        set({ items: get().items.filter(i => !moduleIdSet.has(i.moduleId)) });
      },
      
      setConstraints: (c) => {
        set({ constraints: { ...get().constraints, ...c } });
      },
      
      setModuleState: (moduleId, state) => {
        set({
          moduleStates: { ...get().moduleStates, [moduleId]: state }
        });
      },
      
      clearModuleState: (moduleId) => {
        const { [moduleId]: _, ...rest } = get().moduleStates;
        set({ moduleStates: rest });
      },
      
      isModuleModified: (moduleId) => {
        const moduleState = get().moduleStates[moduleId];
        if (!moduleState?.originalCourseIds) return false;
        
        const currentCourseIds = new Set(
          get().items
            .filter(i => i.moduleId === moduleId)
            .map(i => i.courseId)
        );
        const originalSet = new Set(moduleState.originalCourseIds);
        
        // Compare sets (order-independent)
        if (currentCourseIds.size !== originalSet.size) return true;
        for (const id of currentCourseIds) {
          if (!originalSet.has(id)) return true;
        }
        return false;
      },
      
      pinAllItems: (moduleId) => {
        const items = get().items;
        const updated = items.map(item =>
          item.moduleId === moduleId && item.status === 'auto-filled'
            ? { ...item, status: 'pinned' as const }
            : item
        );
        set({ items: updated });
        
        void trackTelemetryEvent({
          task: 'pin_all_clicked',
          scope: 'module',
          complexity: {
            moduleId,
            itemCount: updated.filter(i => i.moduleId === moduleId && i.status === 'pinned').length
          }
        });
      },
      
      unpinAllItems: (moduleId) => {
        const items = get().items;
        const updated = items.map(item =>
          item.moduleId === moduleId && 
          item.status === 'pinned' && 
          item.source?.type === 'template'
            ? { ...item, status: 'auto-filled' as const }
            : item
        );
        set({ items: updated });
        
        void trackTelemetryEvent({
          task: 'unpin_all_clicked',
          scope: 'module',
          complexity: {
            moduleId,
            itemCount: updated.filter(i => i.moduleId === moduleId && i.status === 'auto-filled').length
          }
        });
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
      
      applyTemplateToPlan: (template: any) => {
        console.log('[usePlanBasket] Applying degree template to plan:', template?.id || template?.programId);
        
        if (!template?.yearTemplates) {
          console.warn('[usePlanBasket] Template missing yearTemplates, skipping');
          return;
        }
        
        const items: BasketItem[] = [];
        
        // Hydrate basket from template structure
        for (const yearTemplate of template.yearTemplates) {
          if (!yearTemplate.moduleTemplates) continue;
          
          for (const moduleTemplate of yearTemplate.moduleTemplates) {
            const { moduleId, options, recommendedCourseId } = moduleTemplate;
            
            // Pick the recommended course or first option
            const selectedOption = recommendedCourseId
              ? options.find(opt => opt.courseId === recommendedCourseId)
              : options[0];
            
            if (!selectedOption) continue;
            
            // Create basket item from template option
            items.push({
              moduleId,
              courseId: selectedOption.courseId,
              title: selectedOption.title,
              credits: selectedOption.credits,
              cost_usd: selectedOption.cost_usd ?? null,
              duration_weeks: selectedOption.duration_weeks ?? null,
              workload_weekly_hours: selectedOption.workload_weekly_hours ?? (selectedOption.credits * 3),
              cri_score: selectedOption.cri_score ?? 0,
              status: 'auto-filled',
              providerType: selectedOption.providerType,
              providerCode: selectedOption.providerCode,
              level: selectedOption.level,
              source: {
                type: 'template',
                templateId: template.id,
                templateVersion: 1,
                templateLabel: template.label || template.optimization,
              },
            });
          }
        }
        
        console.log('[usePlanBasket] Template hydrated:', {
          templateId: template.id,
          itemsCreated: items.length,
          totalCredits: items.reduce((sum, i) => sum + i.credits, 0),
        });
        
        // Replace basket with template items
        set({ items });
        
        void trackTelemetryEvent({
          task: 'template_applied_to_plan',
          scope: 'degree',
          complexity: {
            templateId: template.id,
            itemsCount: items.length,
            programId: template.programId,
            optimization: template.optimization,
          },
        });
      },
      
      getTotals: () => {
        const items = get().items;
        const constraints = get().constraints;
        
        // Phase 1c: Use shared totals calculator (single source of truth)
        return calculateTotals(items, constraints);
      },
      
      // Memoized selectors to prevent re-render storms
      selectModuleItems: (moduleId: string) => {
        return get().items.filter(item => item.moduleId === moduleId);
      },
      
      selectModuleViewState: (moduleId: string) => {
        const moduleState = get().moduleStates[moduleId];
        const items = get().items.filter(item => item.moduleId === moduleId);
        const hasItems = items.length > 0;
        
        if (!hasItems && !moduleState?.templateId) return 'empty';
        if (!hasItems && moduleState?.templateId) return 'template-intact';
        if (hasItems && moduleState?.templateId) {
          return get().isModuleModified(moduleId) ? 'modified' : 'template-intact';
        }
        return 'custom';
      }
    }),
    { 
      name: 'v5-plan-basket',
      // Schema versions:
      // v1 = providerType + workload_weekly_hours
      // v2 = adds optional autoFillReason (no migration needed - optional field)
      // v3 = scenarios: Record → PlanScenario[] with cap enforcement
      // v4 = structured provenance (source) + moduleStates tracking
      version: 4,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState ?? {};
        
        if (version === 0) {
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
        
        // v3 → v4: Backfill structured source
        if (version < 4) {
          state = {
            ...state,
            items: migrateBasketItems(state.items || []),
            moduleStates: {} // Initialize empty
          };
        }

        return state;
      }
    }
  )
);

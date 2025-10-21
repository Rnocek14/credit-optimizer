import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanBasket } from '../usePlanBasket';
import type { BasketItem } from '../usePlanBasket';

const mockItem1: BasketItem = {
  moduleId: 'm1',
  courseId: 'c1',
  title: 'Course 1',
  credits: 3,
  cost_usd: 100,
  duration_weeks: 8,
  workload_weekly_hours: 10,
  cri_score: 80,
  status: 'pinned',
  providerType: 'mooc',
};

const mockItem2: BasketItem = {
  moduleId: 'm2',
  courseId: 'c2',
  title: 'Course 2',
  credits: 4,
  cost_usd: 200,
  duration_weeks: 12,
  workload_weekly_hours: 15,
  cri_score: 90,
  status: 'auto-filled',
  providerType: 'university',
};

describe('usePlanBasket v3 Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('migrates v2 scenarios (Record) to v3 (PlanScenario[])', () => {
    const v2State = {
      items: [],
      constraints: {},
      scenarios: {
        'Plan A': { items: [mockItem1], constraints: { max_budget_usd: 500 } },
        'Plan B': { items: [mockItem2], constraints: {} },
      },
    };
    
    // Simulate v2 state in localStorage
    localStorage.setItem('v5-plan-basket', JSON.stringify({
      state: v2State,
      version: 2,
    }));
    
    // Hydrate store (triggers migration)
    const { scenarios } = usePlanBasket.getState();
    
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios).toHaveLength(2);
    
    // Verify structure
    expect(scenarios[0]).toHaveProperty('id');
    expect(scenarios[0]).toHaveProperty('name');
    expect(scenarios[0]).toHaveProperty('createdAt');
    expect(scenarios[0]).toHaveProperty('totals');
    expect(scenarios[0].totals).toHaveProperty('totalCost');
    
    // Verify names preserved
    const names = scenarios.map(s => s.name).sort();
    expect(names).toEqual(['Plan A', 'Plan B']);
  });
  
  it('caps scenarios at 20 and evicts oldest', () => {
    // Create 25 v2 scenarios
    const v2Scenarios: any = {};
    for (let i = 0; i < 25; i++) {
      v2Scenarios[`Plan ${i}`] = {
        items: [{ ...mockItem1, courseId: `c${i}` }],
        constraints: {},
      };
    }
    
    localStorage.setItem('v5-plan-basket', JSON.stringify({
      state: { items: [], constraints: {}, scenarios: v2Scenarios },
      version: 2,
    }));
    
    const { scenarios } = usePlanBasket.getState();
    
    expect(scenarios).toHaveLength(20);
    // All should have valid structure
    scenarios.forEach(s => {
      expect(s.id).toBeTruthy();
      expect(s.createdAt).toBeTruthy();
      expect(s.totals).toBeDefined();
    });
  });
});

describe('usePlanBasket v3 CRUD', () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanBasket.setState({ items: [], constraints: {}, scenarios: [] });
  });
  
  it('saveScenario returns ID and stores with totals', () => {
    const { saveScenario, addItem } = usePlanBasket.getState();
    
    addItem(mockItem1);
    const id = saveScenario('Test Plan');
    
    expect(id).toBeTruthy();
    
    const { scenarios } = usePlanBasket.getState();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].id).toBe(id);
    expect(scenarios[0].name).toBe('Test Plan');
    expect(scenarios[0].totals.totalCost).toBe(100);
  });
  
  it('loadScenario restores items and constraints', () => {
    const { saveScenario, loadScenario, addItem, clearAll } = usePlanBasket.getState();
    
    addItem(mockItem1);
    const id = saveScenario('Load Test');
    
    clearAll();
    expect(usePlanBasket.getState().items).toHaveLength(0);
    
    loadScenario(id);
    expect(usePlanBasket.getState().items).toHaveLength(1);
    expect(usePlanBasket.getState().items[0].courseId).toBe('c1');
  });
  
  it('deleteScenario removes by ID', () => {
    const { saveScenario, deleteScenario, addItem } = usePlanBasket.getState();
    
    addItem(mockItem1);
    const id = saveScenario('Delete Test');
    
    expect(usePlanBasket.getState().scenarios).toHaveLength(1);
    
    deleteScenario(id);
    expect(usePlanBasket.getState().scenarios).toHaveLength(0);
  });
  
  it('enforces 20-scenario cap with LRU eviction', () => {
    const { saveScenario, addItem } = usePlanBasket.getState();
    
    addItem(mockItem1);
    
    // Save 21 scenarios
    for (let i = 0; i < 21; i++) {
      saveScenario(`Plan ${i}`);
    }
    
    const { scenarios } = usePlanBasket.getState();
    expect(scenarios).toHaveLength(20);
    
    // Newest should be first (Plan 20)
    expect(scenarios[0].name).toBe('Plan 20');
    // Oldest (Plan 0) should be evicted
    expect(scenarios.find(s => s.name === 'Plan 0')).toBeUndefined();
  });
  
  it('uses default name when name is empty', () => {
    const { saveScenario, addItem } = usePlanBasket.getState();
    
    addItem(mockItem1);
    const id = saveScenario('');
    
    const { scenarios } = usePlanBasket.getState();
    expect(scenarios[0].name).toMatch(/^Plan – /);
  });
});

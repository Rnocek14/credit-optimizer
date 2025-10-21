import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanBasket } from './usePlanBasket';

describe('usePlanBasket - ACE Credit Tracking', () => {
  beforeEach(() => {
    usePlanBasket.setState({ items: [], constraints: {} });
  });

  it('counts MOOC credits toward ACE total', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 7.5,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    expect(getTotals().aceCredits).toBe(3);
  });

  it('counts testing_center credits toward ACE total', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 50,
      duration_weeks: 4,
      workload_weekly_hours: 5,
      cri_score: 85,
      status: 'pinned',
      providerType: 'testing_center'
    });
    
    expect(getTotals().aceCredits).toBe(3);
  });

  it('does not count university credits toward ACE total', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 500,
      duration_weeks: 16,
      workload_weekly_hours: 10,
      cri_score: 95,
      status: 'pinned',
      providerType: 'university'
    });
    
    expect(getTotals().aceCredits).toBe(0);
  });

  it('handles items without providerType gracefully', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 7.5,
      cri_score: 80,
      status: 'pinned',
      providerType: null
    });
    
    expect(getTotals().aceCredits).toBe(0);
  });

  it('sums multiple MOOC and testing center credits', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 7.5,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    addItem({
      moduleId: 'mod2',
      courseId: 'course2',
      credits: 4,
      cost_usd: 50,
      duration_weeks: 4,
      workload_weekly_hours: 5,
      cri_score: 85,
      status: 'pinned',
      providerType: 'testing_center'
    });
    
    expect(getTotals().aceCredits).toBe(7);
  });
});

describe('usePlanBasket - Concurrency Math', () => {
  beforeEach(() => {
    usePlanBasket.setState({ items: [], constraints: {} });
  });

  it('calculates realistic weeks with concurrency=2', () => {
    const { addItem, setConstraints, getTotals } = usePlanBasket.getState();
    
    setConstraints({ max_concurrent_courses: 2 });
    
    // Add 4 courses × 12 weeks each = 48 weeks serial
    for (let i = 1; i <= 4; i++) {
      addItem({
        moduleId: `mod${i}`,
        courseId: `course${i}`,
        credits: 3,
        cost_usd: 100,
        duration_weeks: 12,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      });
    }
    
    // With concurrency=2, should be 48/2 = 24 weeks
    expect(getTotals().totalWeeks).toBe(24);
  });

  it('calculates realistic weeks with concurrency=1', () => {
    const { addItem, setConstraints, getTotals } = usePlanBasket.getState();
    
    setConstraints({ max_concurrent_courses: 1 });
    
    // Add 4 courses × 12 weeks each = 48 weeks serial
    for (let i = 1; i <= 4; i++) {
      addItem({
        moduleId: `mod${i}`,
        courseId: `course${i}`,
        credits: 3,
        cost_usd: 100,
        duration_weeks: 12,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      });
    }
    
    // With concurrency=1, should be 48 weeks
    expect(getTotals().totalWeeks).toBe(48);
  });

  it('uses default concurrency of 2 when not set', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    // Add 2 courses × 12 weeks each
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 12,
      workload_weekly_hours: 7.5,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    addItem({
      moduleId: 'mod2',
      courseId: 'course2',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 12,
      workload_weekly_hours: 7.5,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    // Default concurrency=2, so 24/2 = 12 weeks
    expect(getTotals().totalWeeks).toBe(12);
  });
});

describe('usePlanBasket - Workload Totals', () => {
  beforeEach(() => {
    usePlanBasket.setState({ items: [], constraints: {} });
  });

  it('calculates total weekly hours correctly', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 10,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    addItem({
      moduleId: 'mod2',
      courseId: 'course2',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 15,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    expect(getTotals().totalWorkloadHours).toBe(25);
  });

  it('handles undefined workload_weekly_hours', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: undefined as any,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    // Should not be NaN
    expect(getTotals().totalWorkloadHours).toBe(0);
  });

  it('sums workload for multiple courses', () => {
    const { addItem, getTotals } = usePlanBasket.getState();
    
    addItem({
      moduleId: 'mod1',
      courseId: 'course1',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 10,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    addItem({
      moduleId: 'mod2',
      courseId: 'course2',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 15,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    addItem({
      moduleId: 'mod3',
      courseId: 'course3',
      credits: 3,
      cost_usd: 100,
      duration_weeks: 8,
      workload_weekly_hours: 25,
      cri_score: 80,
      status: 'pinned',
      providerType: 'mooc'
    });
    
    expect(getTotals().totalWorkloadHours).toBe(50);
  });
});

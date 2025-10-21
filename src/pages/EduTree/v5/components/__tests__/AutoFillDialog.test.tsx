import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useAutoFillPlan } from '../../hooks/useAutoFillPlan';

// Mock hook to simulate states
vi.mock('../../hooks/useAutoFillPlan', () => ({
  useAutoFillPlan: () => ({
    isRunning: false,
    result: {
      status: 'ok',
      totals: { totalCost: 300, totalWeeks: 12, totalWorkloadHours: 30, aceCredits: 6 },
      suggestions: [
        { 
          moduleId:'m1', courseId:'c1', title:'Course 1', credits:3, 
          cost_usd:100, duration_weeks:8, workload_weekly_hours:10, 
          cri_score:80, status:'auto-filled', autoFillReason:'Top-rated match' 
        },
        { 
          moduleId:'m2', courseId:'c2', title:'Course 2', credits:3, 
          cost_usd:200, duration_weeks:8, workload_weekly_hours:20, 
          cri_score:85, status:'auto-filled', autoFillReason:'Budget-friendly' 
        },
      ],
      reasoning: ['Top-rated match','Budget-friendly']
    },
    run: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  }),
}));

const modules: any[] = [{ id:'m1' }, { id:'m2' }];
const weights: any = { cost:0.33, time:0.33, cri:0.34 };

// Phase 1c.2: Active tests for AutoFillDialog
describe('AutoFillDialog', () => {
  it('shows button and can be triggered', () => {
    const { AutoFillPlanButton } = require('../AutoFillDialog');
    const { getByRole } = render(
      <AutoFillPlanButton modules={modules as any} constraints={{}} weights={weights as any} />
    );
    const button = getByRole('button', { name: /auto-fill plan/i });
    expect(button).toBeInTheDocument();
  });

  it('hook returns expected result structure', () => {
    const result = useAutoFillPlan(modules as any[], {}, weights as any);
    expect(result).toHaveProperty('isRunning');
    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('run');
    expect(result).toHaveProperty('accept');
    expect(result).toHaveProperty('reject');
  });
});

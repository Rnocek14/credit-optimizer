import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
// Note: AutoFillDialog will be created in Phase 1c.2
// import { AutoFillPlanButton } from '../AutoFillDialog';

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

// Placeholder tests - will pass when AutoFillDialog.tsx is implemented
describe.skip('AutoFillDialog', () => {
  it.skip('launches dialog and shows results summary', async () => {
    // Uncomment when AutoFillPlanButton is implemented
    // render(<AutoFillPlanButton modules={modules as any} weights={weights as any} />);
    // fireEvent.click(screen.getByRole('button', { name: /auto-fill plan/i }));
    // expect(await screen.findByRole('dialog')).toBeInTheDocument();
    // expect(screen.getByText(/Plan complete|Partial plan|No suggestions/i)).toBeInTheDocument();
    // expect(screen.getByText(/\$?300/)).toBeInTheDocument();
  });

  it.skip('has accessible progress messaging', async () => {
    // Uncomment when AutoFillPlanButton is implemented
    // render(<AutoFillPlanButton modules={modules as any} weights={weights as any} />);
    // fireEvent.click(screen.getByRole('button', { name: /auto-fill plan/i }));
    // const polite = await screen.findByText(/Analyzing/i);
    // expect(polite).toHaveAttribute('aria-live', 'polite');
  });
});

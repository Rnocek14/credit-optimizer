import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModuleCard } from './ModuleCard';
import type { MarketplaceOption } from '../types/v5';

// Mock Zustand stores
jest.mock('../state/usePlanStore', () => ({
  usePlanStore: () => ({
    selections: {},
    toggleCourse: jest.fn(),
  }),
}));

jest.mock('../state/usePlanBasket', () => ({
  usePlanBasket: () => ({
    items: [],
    moduleStates: {},
  }),
}));

jest.mock('../hooks/usePlanBasketWithToasts', () => ({
  usePlanBasketWithToasts: () => ({
    removeItemWithToast: jest.fn(),
  }),
}));

jest.mock('../hooks/useAutoFillModule', () => ({
  useAutoFillModule: () => ({
    quickPick: jest.fn(),
  }),
}));

jest.mock('@/utils/telemetry', () => ({
  trackTelemetryEvent: jest.fn(),
}));

jest.mock('../utils/safeTelemetry', () => ({
  safeTrack: jest.fn(),
}));

describe('ModuleCard - Options Count Display', () => {
  const baseProps = {
    id: 'test-mod',
    label: 'Test Module',
    icon: '📖',
    description: 'Test description',
    courses: [],
    creditsEarned: 0,
    creditsRequired: 6,
    isCollapsed: false,
    onToggle: jest.fn(),
    optionsCount: 0,
  };

  const mockOption: MarketplaceOption = {
    id: '1',
    courseId: 'C1',
    title: 'Course 1',
    credits: 3,
    subject: 'CS',
    provider: 'Test',
    cost_usd: 100,
    duration_weeks: 8,
  };

  it('shows correct count when optionsCount matches array', () => {
    const options = [mockOption, { ...mockOption, id: '2', courseId: 'C2' }, { ...mockOption, id: '3', courseId: 'C3' }];
    
    const { getByText, queryByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={3}
        marketplaceOptions={options}
      />
    );
    
    expect(getByText(/3 options available/i)).toBeInTheDocument();
    expect(queryByText(/no marketplace options/i)).not.toBeInTheDocument();
  });

  it('derives count from array when optionsCount is zero but array has items', () => {
    const { getByText, queryByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={0} // Stale/wrong prop
        marketplaceOptions={[mockOption]}
      />
    );
    
    // Should derive from array (1), not prop (0)
    expect(getByText(/1 option available/i)).toBeInTheDocument();
    expect(queryByText(/no marketplace options/i)).not.toBeInTheDocument();
  });

  it('derives count from array when optionsCount is undefined', () => {
    const { getByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={undefined} // Missing prop
        marketplaceOptions={[mockOption, { ...mockOption, id: '2', courseId: 'C2' }]}
      />
    );
    
    expect(getByText(/2 options available/i)).toBeInTheDocument();
  });

  it('shows empty state only when truly zero options', () => {
    const { getByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={0}
        marketplaceOptions={[]}
      />
    );
    
    expect(getByText(/no marketplace options available/i)).toBeInTheDocument();
  });

  it('never shows "0 options" when array has items', () => {
    const { getByText, queryByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={0} // Stale prop
        marketplaceOptions={[mockOption]}
      />
    );
    
    // Should derive from array, so display "1 option"
    expect(getByText(/1 option available/i)).toBeInTheDocument();
    expect(queryByText(/no marketplace options/i)).not.toBeInTheDocument();
  });

  it('shows loading state when marketplaceOptions is undefined', () => {
    const { getByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={0}
        marketplaceOptions={undefined}
      />
    );
    
    expect(getByText(/loading options/i)).toBeInTheDocument();
  });

  it('uses singular "option" for count of 1', () => {
    const { getByText, queryByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={1}
        marketplaceOptions={[mockOption]}
      />
    );
    
    expect(getByText(/1 option available/i)).toBeInTheDocument();
    expect(queryByText(/options available/i)).not.toBeInTheDocument();
  });

  it('uses plural "options" for count greater than 1', () => {
    const { getByText } = render(
      <ModuleCard 
        {...baseProps}
        optionsCount={5}
        marketplaceOptions={[mockOption, { ...mockOption, id: '2' }]}
      />
    );
    
    // Even though array has 2, derivation should use array length
    expect(getByText(/2 options available/i)).toBeInTheDocument();
  });
});

/**
 * Credit Optimizer Types
 * Data structures for the credit optimization feature
 */

export interface OptimizationSummary {
  currentCost: number;
  optimizedCost: number;
  currentMonths: number;
  optimizedMonths: number;
  costSaved: number;
  monthsSaved: number;
  anchorLabel: string;
  isPolicyCompliant: boolean;
}

export interface OptimizationSwap {
  id: string;
  requirementLabel: string;
  fromTitle: string;
  fromProvider: string;
  fromCost: number;
  toTitle: string;
  toProvider: string;
  toCost: number;
  costSaved: number;
  moduleId: string;
  fromCourseId: string;
  toCourseId: string;
}

export interface OptimizationSuggestion {
  hasSuggestion: boolean;
  summary: OptimizationSummary | null;
  swaps: OptimizationSwap[];
}

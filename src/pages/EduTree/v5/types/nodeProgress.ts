/**
 * Node progress summary for visualization
 * Computed from basket selections at degree/year/module level
 */
export interface NodeSelectedSummary {
  scope: 'degree' | 'year' | 'module';
  credits: number;
  creditsRequired: number;
  cost: number;
  weeks: number;
  avgCri: number;
  courseCount: number;
  progressPercent: number;
  isComplete: boolean;
  isEmpty: boolean;
  templateSource?: string; // Which template filled this node
}

/**
 * Compute module-level selection summary
 */
export function computeModuleSummary(
  moduleId: string,
  creditsRequired: number,
  basketItems: Array<{
    moduleId: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    cri_score: number;
    status?: string;
    autoFillReason?: string;
  }>
): NodeSelectedSummary {
  const moduleItems = basketItems.filter(item => item.moduleId === moduleId);

  const totalCredits = moduleItems.reduce((sum, i) => sum + i.credits, 0);
  const totalCost = moduleItems.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  const maxWeeks = Math.max(...moduleItems.map(i => i.duration_weeks ?? 0), 0);
  const avgCri =
    moduleItems.length > 0
      ? moduleItems.reduce((sum, i) => sum + i.cri_score, 0) / moduleItems.length
      : 0;

  // Detect template source (if all items have same autoFillReason)
  const templateSources = new Set(
    moduleItems
      .filter(i => i.status === 'auto-filled' && i.autoFillReason)
      .map(i => i.autoFillReason)
  );
  const templateSource = templateSources.size === 1 ? Array.from(templateSources)[0] : undefined;

  return {
    scope: 'module',
    credits: totalCredits,
    creditsRequired,
    cost: totalCost,
    weeks: maxWeeks,
    avgCri,
    courseCount: moduleItems.length,
    progressPercent: creditsRequired > 0 ? (totalCredits / creditsRequired) * 100 : 0,
    isComplete: totalCredits >= creditsRequired,
    isEmpty: moduleItems.length === 0,
    templateSource,
  };
}

/**
 * Compute year-level selection summary
 */
export function computeYearSummary(
  year: number,
  modulesInYear: Array<{ id: string; creditsRequired: number }>,
  basketItems: Array<{
    moduleId: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    cri_score: number;
  }>
): NodeSelectedSummary {
  const moduleIds = new Set(modulesInYear.map(m => m.id));
  const yearItems = basketItems.filter(item => moduleIds.has(item.moduleId));

  const totalCreditsRequired = modulesInYear.reduce((sum, m) => sum + m.creditsRequired, 0);
  const totalCredits = yearItems.reduce((sum, i) => sum + i.credits, 0);
  const totalCost = yearItems.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  const maxWeeks = Math.max(...yearItems.map(i => i.duration_weeks ?? 0), 0);
  const avgCri =
    yearItems.length > 0 ? yearItems.reduce((sum, i) => sum + i.cri_score, 0) / yearItems.length : 0;

  return {
    scope: 'year',
    credits: totalCredits,
    creditsRequired: totalCreditsRequired,
    cost: totalCost,
    weeks: maxWeeks,
    avgCri,
    courseCount: yearItems.length,
    progressPercent: totalCreditsRequired > 0 ? (totalCredits / totalCreditsRequired) * 100 : 0,
    isComplete: totalCredits >= totalCreditsRequired,
    isEmpty: yearItems.length === 0,
  };
}

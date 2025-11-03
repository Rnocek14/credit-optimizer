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
  
  // Week 1: Anchor-aware metrics
  unmetRequirements?: Array<{
    blockId: string;
    blockSlug: string;
    label: string;
    rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
    creditsNeeded: number;
    moduleIds: string[];
    violations?: string[];
  }>;
  // Year-level: only this year's metrics (no caps/requirements)
  // Degree-level: cumulative metrics with caps/requirements
  transferMetrics?: {
    // For YEAR scope: this year only
    aceCreditsThisYear?: number;
    residencyCreditsThisYear?: number;
    upperDivisionCreditsThisYear?: number;
    
    // For DEGREE scope: cumulative across all years
    aceCumulative?: number;
    aceCap?: number;
    residencyCumulative?: number;
    residencyRequired?: number;
    upperDivisionCumulative?: number;
    upperDivisionRequired?: number;
  };
  policyWarnings?: Array<{
    type: 'transfer_cap' | 'residency' | 'upper_division' | 'prerequisite';
    severity: 'error' | 'warning' | 'info';
    message: string;
    affectedModuleIds: string[];
  }>;
  warnings?: string[]; // Year or degree-level warnings
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

  // Detect template source using structured provenance (fallback to autoFillReason)
  const templateSources = new Set(
    moduleItems
      .filter(i => i.status === 'auto-filled')
      .map(i => {
        // Prefer structured source
        if ((i as any).source?.templateLabel) {
          return `From template: ${(i as any).source.templateLabel}`;
        }
        // Fallback to legacy autoFillReason
        return (i as any).autoFillReason;
      })
      .filter(Boolean)
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
 * Compute year-level selection summary (Week 1: Extended with anchor metrics)
 */
export function computeYearSummary(
  year: number,
  modulesInYear: Array<{ 
    id: string; 
    creditsRequired: number;
    requirement_block_id?: string;
    upper_division?: boolean;
  }>,
  basketItems: Array<{
    moduleId: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    cri_score: number;
    providerType?: 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null;
    level?: number;
  }>,
  blocks?: Array<{ 
    id: string; 
    slug?: string; 
    title: string; 
    rule_type: 'ALL' | 'K_OF_N' | 'CREDITS'; 
    k?: number | null;
    credits_needed?: number | null;
  }>,
  anchorPolicy?: { 
    max_alt_credits: number; 
    min_residency_credits: number; 
    upper_division_min: number;
  }
): NodeSelectedSummary {
  const moduleIds = new Set(modulesInYear.map(m => m.id));
  const yearItems = basketItems.filter(item => moduleIds.has(item.moduleId));

  const totalCreditsRequired = modulesInYear.reduce((sum, m) => sum + m.creditsRequired, 0);
  const totalCredits = yearItems.reduce((sum, i) => sum + i.credits, 0);
  const totalCost = yearItems.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  const maxWeeks = Math.max(...yearItems.map(i => i.duration_weeks ?? 0), 0);
  const avgCri =
    yearItems.length > 0 ? yearItems.reduce((sum, i) => sum + i.cri_score, 0) / yearItems.length : 0;

  // Week 1: Compute unmet requirements using isBlockComplete
  let unmetRequirements: NodeSelectedSummary['unmetRequirements'];
  if (blocks) {
    const yearBlocks = blocks.filter(b => 
      modulesInYear.some(m => m.requirement_block_id === b.id)
    );
    
    // Filter blocks that are not complete
    unmetRequirements = yearBlocks
      .map(block => {
        const blockMods = modulesInYear.filter(m => m.requirement_block_id === block.id);
        const blockItems = yearItems.filter(b => blockMods.some(m => m.id === b.moduleId));
        
        // Check completion (simplified - full integration requires isBlockComplete from eduTree.ts)
        const completedCredits = blockItems.reduce((sum, i) => sum + i.credits, 0);
        const requiredCredits = block.credits_needed || 0;
        const isComplete = block.rule_type === 'CREDITS' 
          ? completedCredits >= requiredCredits
          : blockItems.length >= (block.k || blockMods.length);
        
        return isComplete ? null : {
          blockId: block.id,
          blockSlug: block.slug || '',
          label: block.title,
          rule_type: block.rule_type,
          creditsNeeded: block.credits_needed || 0,
          moduleIds: blockMods.map(m => m.id),
          violations: [],
        };
      })
      .filter(Boolean) as NonNullable<typeof unmetRequirements>;
  }

  // Week 1: Compute year-local transfer/residency metrics only
  // Do NOT compare to degree-level caps/requirements here
  let transferMetrics: NodeSelectedSummary['transferMetrics'];
  if (anchorPolicy) {
    transferMetrics = {
      aceCreditsThisYear: yearItems.filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center').reduce((sum, i) => sum + i.credits, 0),
      residencyCreditsThisYear: yearItems.filter(i => i.providerType === 'university').reduce((sum, i) => sum + i.credits, 0),
      upperDivisionCreditsThisYear: yearItems.filter(i => (i.level || 0) >= 300).reduce((sum, i) => sum + i.credits, 0),
    };
  }

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
    unmetRequirements,
    transferMetrics,
  };
}

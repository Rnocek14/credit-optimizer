/**
 * V6 Language Layer
 * 
 * Rewrites V5 jargon into user-friendly, non-judgmental copy.
 * No logic changes — just text + tone.
 */

export const V6_COPY = {
  // Status badges — no anxiety before action
  statusReady: 'Ready to Start',
  statusInProgress: 'In Progress',
  statusOnTrack: 'On Track',
  statusAhead: 'Ahead of Plan',
  statusComplete: 'Complete',
  
  // Module card language
  recommendedLabel: 'Top Recommendation',
  optionsAvailable: (n: number) => `View ${n} approved ${n === 1 ? 'equivalency' : 'equivalencies'}`,
  openPanel: 'View Fulfillment Options',
  
  // Year sections
  yearLocked: (y: number) => `Year ${y} — Complete earlier years to continue`,
  yearClickToExpand: 'Click to expand',
  
  // Banners — no "warnings"
  policyConsiderations: 'Policy Considerations',
  optimizationOpportunity: 'Optimization Opportunity',
  transferConsideration: 'Transfer Consideration',
  
  // Entry hero
  heroTitle: (degreeTitle: string) => degreeTitle || 'Build Your Degree Plan',
  heroSubtitle: 'Plan your degree in 3 steps',
  step1: 'Complete Year 1',
  step2: 'Optimize transfers',
  step3: 'Graduate debt-efficient',
  startYear1: 'Start with Year 1',
  browseDegrees: 'Browse Degree Templates',
  seeFullMap: 'See Full Degree Map',
  
  // Header
  buildingPlan: 'Building your degree plan',
  noPlan: 'Select or create a plan to get started',
  
  // Banner stack
  showDetails: 'Show details',
  hideDetails: 'Hide details',

  // Header degree selector
  degreeLabel: 'Degree',
  selectDegree: 'Select Degree',

  // Why this ranking
  whyThisRanking: 'Why this recommendation?',
} as const;

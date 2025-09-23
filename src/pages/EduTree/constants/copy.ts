/**
 * UI copy constants for EduTree components
 * Centralized for easy A/B testing and i18n later
 */

export const COPY = {
  // ComparisonLegend
  trackComparison: 'Track Comparison',
  trackComparisonTooltip: 'Visual comparison of educational pathways',
  primaryTrack: 'Primary Track',
  comparisonTrack: 'Comparison Track',
  sharedRequirements: 'Shared Requirements',
  commonToBoth: 'Common to both',
  coursesNotInTracks: 'Courses not in selected tracks are dimmed',
  hoverForDetails: 'Hover over courses for detailed information',
  hideTrackComparison: 'Hide track comparison',
  showTrackComparison: 'Show track comparison',
  collapseComparison: 'Collapse comparison legend',
  expandComparison: 'Expand comparison legend',

  // EnhancedControls
  viewControls: 'View Controls',
  viewControlsTooltip: 'Customize how courses and tracks are displayed',
  viewMode: 'View Mode',
  layoutDensity: 'Layout Density',
  advancedOptions: 'Advanced Options',
  showCompleted: 'Show Completed',
  showPrerequisites: 'Show Prerequisites',
  resetView: 'Reset View',
  centerGraph: 'Center Graph',
  hideControls: 'Hide controls',
  showControls: 'Show controls',
  collapseAdvanced: 'Collapse advanced options',
  expandAdvanced: 'Expand advanced options',

  // ProgressIndicator
  complete: 'Complete',
  inProgress: 'In Progress',
  locked: 'Locked',

  // View modes
  overview: 'Overview',
  detailed: 'Detailed',
  comparison: 'Comparison',

  // Layout density
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious'
} as const;
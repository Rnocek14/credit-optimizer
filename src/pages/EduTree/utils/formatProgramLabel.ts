/**
 * Format program labels with duration context for comparison UI
 */

export function formatProgramLabel(programId: string): string {
  switch (programId) {
    case 'bs_cs':
      return 'BS CS — 4-year (typical)';
    case 'bs_it':
      return 'BS IT — 3-year (accelerated)';
    default:
      return programId.toUpperCase();
  }
}

export function formatTrackLabel(trackId: string): string {
  switch (trackId) {
    case 'se':
      return 'Software Engineering';
    case 'ds':
      return 'Data Science';
    default:
      return trackId.toUpperCase();
  }
}
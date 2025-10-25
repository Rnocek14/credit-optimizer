/**
 * Centralized formatters for consistent data display
 * Prevents "$undefined", "NaNw", etc. in UI
 */

export const formatCost = (cost: number | null | undefined): string => {
  if (cost == null || cost <= 0) return 'Free';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0 
  }).format(cost);
};

export const formatDuration = (weeks: number | null | undefined): string => {
  return weeks != null && weeks > 0 ? `${weeks}w` : 'N/A';
};

export const formatCRI = (cri: number | null | undefined): string => {
  return cri != null && !isNaN(cri) ? Math.round(cri).toString() : 'N/A';
};

export const formatWorkload = (hours: number | null | undefined): string => {
  return hours != null && hours > 0 ? `${Math.round(hours)}h/w` : 'N/A';
};

export const formatCredits = (credits: number | null | undefined): string => {
  return credits != null ? `${credits}cr` : '0cr';
};

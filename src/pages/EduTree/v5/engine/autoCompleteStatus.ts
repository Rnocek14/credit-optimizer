import type { AutoCompleteStatus } from './autoComplete';

/**
 * Centralized status messaging for auto-complete results
 * Used in console feedback and future toast notifications
 */
export function getAutoCompleteMessage(
  status: AutoCompleteStatus,
  suggestionsCount: number,
  unfilledCount: number
): string {
  switch (status) {
    case 'ok':
      return `✨ Auto-completed all ${suggestionsCount} modules`;
    case 'partial':
      return `✨ Auto-completed ${suggestionsCount} of ${unfilledCount} modules (${unfilledCount - suggestionsCount} blocked by constraints)`;
    case 'none':
      return '⚠️ No modules could be auto-completed under current constraints';
  }
}

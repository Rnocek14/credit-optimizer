import type { AutoCompleteStatus } from './autoComplete';

/**
 * Simple pluralization helper
 */
function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

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
      return `✨ Auto-completed all ${suggestionsCount} ${pluralize('module', suggestionsCount)}`;
    case 'partial':
      return `✨ Auto-completed ${suggestionsCount} of ${unfilledCount} ${pluralize('module', unfilledCount)} (${unfilledCount - suggestionsCount} blocked by constraints)`;
    case 'none':
      return '⚠️ No modules could be auto-completed under current constraints';
  }
}

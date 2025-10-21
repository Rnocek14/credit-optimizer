import { describe, it, expect } from 'vitest';
import { getAutoCompleteMessage } from './autoCompleteStatus';

describe('getAutoCompleteMessage', () => {
  it('returns correct message for "ok" status', () => {
    const message = getAutoCompleteMessage('ok', 5, 5);
    expect(message).toBe('✨ Auto-completed all 5 modules');
  });

  it('returns correct message for "partial" status', () => {
    const message = getAutoCompleteMessage('partial', 3, 5);
    expect(message).toBe('✨ Auto-completed 3 of 5 modules (2 blocked by constraints)');
  });

  it('returns correct message for "none" status', () => {
    const message = getAutoCompleteMessage('none', 0, 5);
    expect(message).toBe('⚠️ No modules could be auto-completed under current constraints');
  });

  it('handles singular module correctly', () => {
    const message = getAutoCompleteMessage('ok', 1, 1);
    expect(message).toBe('✨ Auto-completed all 1 module');
  });

  it('handles partial with singular unfilled', () => {
    const message = getAutoCompleteMessage('partial', 0, 1);
    expect(message).toBe('✨ Auto-completed 0 of 1 module (1 blocked by constraints)');
  });

  it('handles zero modules', () => {
    const message = getAutoCompleteMessage('ok', 0, 0);
    expect(message).toBe('✨ Auto-completed all 0 modules');
  });
});

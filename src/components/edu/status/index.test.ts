import { resolveStatus } from './index';
import { describe, test, expect } from 'vitest';

describe('resolveStatus', () => {
  test('accepted percent', () => {
    expect(resolveStatus({ accepted: 3, total: 4 }, 'inProgress'))
      .toEqual({ chip: 'Accepted', percent: 75 });
  });

  test('unknown without evidence', () => {
    expect(resolveStatus(undefined, 'inProgress').chip).toBe('Unknown');
  });

  test('locked overrides everything', () => {
    expect(resolveStatus({ accepted: 4, total: 4 }, 'locked').chip).toBe('Locked');
  });

  test('completed status', () => {
    expect(resolveStatus({ accepted: 4, total: 4 }, 'completed').chip).toBe('Completed');
  });

  test('pending with evidence', () => {
    expect(resolveStatus({ pending: 2, total: 4 }, 'inProgress').chip).toBe('Pending');
  });

  test('rejected status', () => {
    expect(resolveStatus({ rejected: 1, total: 4 }, 'inProgress'))
      .toEqual({ chip: 'Rejected', percent: 0 });
  });
});

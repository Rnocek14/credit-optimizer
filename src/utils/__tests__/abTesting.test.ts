import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getABBucket, isExplorationEnabled, trackABAssignment, getCurrentBucket } from '../abTesting';

describe('A/B Testing Utilities', () => {
  beforeEach(() => {
    // Mock localStorage and sessionStorage
    const localStorageMock = new Map<string, string>();
    const sessionStorageMock = new Map<string, string>();
    
    global.localStorage = {
      getItem: (key: string) => localStorageMock.get(key) || null,
      setItem: (key: string, value: string) => localStorageMock.set(key, value),
      removeItem: (key: string) => localStorageMock.delete(key),
      clear: () => localStorageMock.clear(),
      length: localStorageMock.size,
      key: (index: number) => Array.from(localStorageMock.keys())[index] || null,
    } as Storage;

    global.sessionStorage = {
      getItem: (key: string) => sessionStorageMock.get(key) || null,
      setItem: (key: string, value: string) => sessionStorageMock.set(key, value),
      removeItem: (key: string) => sessionStorageMock.delete(key),
      clear: () => sessionStorageMock.clear(),
      length: sessionStorageMock.size,
      key: (index: number) => Array.from(sessionStorageMock.keys())[index] || null,
    } as Storage;
  });

  describe('getABBucket', () => {
    it('splits users ~50/50 deterministically', () => {
      const bucketA = getABBucket('user-a');
      const bucketB = getABBucket('user-b');
      
      expect(['A', 'B']).toContain(bucketA);
      expect(['A', 'B']).toContain(bucketB);
      
      // Deterministic: same input always produces same output
      expect(getABBucket('user-a')).toBe(bucketA);
      expect(getABBucket('user-b')).toBe(bucketB);
    });

    it('produces consistent buckets for same user ID', () => {
      const userId = 'consistent-user-123';
      const bucket1 = getABBucket(userId);
      const bucket2 = getABBucket(userId);
      const bucket3 = getABBucket(userId);
      
      expect(bucket1).toBe(bucket2);
      expect(bucket2).toBe(bucket3);
    });

    it('distributes different user IDs across buckets', () => {
      const buckets = new Set<string>();
      for (let i = 0; i < 100; i++) {
        buckets.add(getABBucket(`user-${i}`));
      }
      
      // Should have both A and B buckets with 100 users
      expect(buckets.size).toBe(2);
      expect(buckets.has('A')).toBe(true);
      expect(buckets.has('B')).toBe(true);
    });
  });

  describe('isExplorationEnabled', () => {
    it('respects localStorage override false', () => {
      localStorage.setItem('v5_exploration_mode', 'false');
      expect(isExplorationEnabled('user-test')).toBe(false);
    });

    it('respects localStorage override true', () => {
      localStorage.setItem('v5_exploration_mode', 'true');
      expect(isExplorationEnabled('user-test')).toBe(true);
    });

    it('falls back to A/B bucket when no override', () => {
      const userId = 'test-user-fallback';
      const bucket = getABBucket(userId);
      const expectedEnabled = bucket === 'B';
      
      expect(isExplorationEnabled(userId)).toBe(expectedEnabled);
    });

    it('returns true for SSR (no window)', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      expect(isExplorationEnabled('user')).toBe(true);
      
      global.window = originalWindow;
    });
  });

  describe('getCurrentBucket', () => {
    it('returns the bucket from getABBucket', () => {
      const userId = 'test-bucket-user';
      const bucket = getABBucket(userId);
      
      expect(getCurrentBucket(userId)).toBe(bucket);
    });
  });

  describe('trackABAssignment', () => {
    it('logs assignment event once per session', () => {
      const logEventMock = vi.fn();
      const userId = 'tracking-user';
      
      trackABAssignment(userId, logEventMock);
      
      expect(logEventMock).toHaveBeenCalledOnce();
      expect(logEventMock).toHaveBeenCalledWith('ab_assignment', {
        test: 'exploration_mode',
        bucket: getABBucket(userId),
        overridden: false,
        finalEnabled: isExplorationEnabled(userId)
      });
    });

    it('does not log again in same session', () => {
      const logEventMock = vi.fn();
      const userId = 'tracking-user-2';
      
      trackABAssignment(userId, logEventMock);
      trackABAssignment(userId, logEventMock);
      trackABAssignment(userId, logEventMock);
      
      expect(logEventMock).toHaveBeenCalledOnce();
    });

    it('tracks override status correctly', () => {
      const logEventMock = vi.fn();
      localStorage.setItem('v5_exploration_mode', 'true');
      
      trackABAssignment('override-user', logEventMock);
      
      expect(logEventMock).toHaveBeenCalledWith('ab_assignment', 
        expect.objectContaining({
          overridden: true
        })
      );
    });

    it('does nothing in SSR environment', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const logEventMock = vi.fn();
      trackABAssignment('ssr-user', logEventMock);
      
      expect(logEventMock).not.toHaveBeenCalled();
      
      global.window = originalWindow;
    });
  });
});

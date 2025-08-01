import { useRef, useCallback } from 'react';

interface QueuedRequest {
  id: string;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

export function useRequestQueue(maxConcurrent = 2, delayBetweenRequests = 1000) {
  const queue = useRef<QueuedRequest[]>([]);
  const activeRequests = useRef(0);
  const lastRequestTime = useRef(0);

  const processQueue = useCallback(async () => {
    if (activeRequests.current >= maxConcurrent || queue.current.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    
    if (timeSinceLastRequest < delayBetweenRequests) {
      setTimeout(() => processQueue(), delayBetweenRequests - timeSinceLastRequest);
      return;
    }

    const request = queue.current.shift();
    if (!request) return;

    activeRequests.current++;
    lastRequestTime.current = now;

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      activeRequests.current--;
      // Process next request after a delay
      setTimeout(() => processQueue(), delayBetweenRequests);
    }
  }, [maxConcurrent, delayBetweenRequests]);

  const enqueueRequest = useCallback(<T>(
    requestFn: () => Promise<T>,
    requestId?: string
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const id = requestId || `req-${Date.now()}-${Math.random()}`;
      
      // Remove duplicate requests with same ID
      if (requestId) {
        queue.current = queue.current.filter(req => req.id !== requestId);
      }

      queue.current.push({
        id,
        fn: requestFn,
        resolve,
        reject,
        timestamp: Date.now()
      });

      processQueue();
    });
  }, [processQueue]);

  const clearQueue = useCallback(() => {
    queue.current.forEach(req => req.reject(new Error('Request cancelled')));
    queue.current = [];
  }, []);

  const getQueueStatus = useCallback(() => ({
    queued: queue.current.length,
    active: activeRequests.current,
    canAcceptNew: queue.current.length < 10 // Prevent queue overflow
  }), []);

  return {
    enqueueRequest,
    clearQueue,
    getQueueStatus
  };
}
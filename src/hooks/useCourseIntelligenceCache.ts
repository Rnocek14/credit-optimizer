import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface CourseDetails {
  id: string;
  title: string;
  platform: { id: string; name: string; url: string };
  instructor?: { id: string; name: string; reputation?: number };
  difficulty: number;
  durationHours: number;
  url: string;
}

interface CacheEntry {
  data: CourseDetails[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const COURSE_CACHE_KEY = 'course-details-cache';

export function useCourseIntelligenceCache() {
  const queryClient = useQueryClient();

  const getCacheKey = useCallback((courseIds: string[]) => {
    return `${COURSE_CACHE_KEY}-${courseIds.sort().join(',')}`;
  }, []);

  const getCachedCourses = useCallback((courseIds: string[]): CourseDetails[] | null => {
    const cacheKey = getCacheKey(courseIds);
    const cached = queryClient.getQueryData<CacheEntry>([cacheKey]);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.expiresAt) {
      queryClient.removeQueries({ queryKey: [cacheKey] });
      return null;
    }
    
    return cached.data;
  }, [queryClient, getCacheKey]);

  const setCachedCourses = useCallback((courseIds: string[], courses: CourseDetails[]) => {
    const cacheKey = getCacheKey(courseIds);
    const now = Date.now();
    
    const cacheEntry: CacheEntry = {
      data: courses,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };
    
    queryClient.setQueryData([cacheKey], cacheEntry);
  }, [queryClient, getCacheKey]);

  const invalidateCache = useCallback((courseIds?: string[]) => {
    if (courseIds) {
      const cacheKey = getCacheKey(courseIds);
      queryClient.removeQueries({ queryKey: [cacheKey] });
    } else {
      // Invalidate all course caches
      queryClient.removeQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0]?.toString().startsWith(COURSE_CACHE_KEY)
      });
    }
  }, [queryClient, getCacheKey]);

  const preloadCourses = useCallback((courseIds: string[], courses: CourseDetails[]) => {
    setCachedCourses(courseIds, courses);
  }, [setCachedCourses]);

  const getCacheStats = useCallback(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const courseQueries = allQueries.filter(query => 
      Array.isArray(query.queryKey) && 
      query.queryKey[0]?.toString().startsWith(COURSE_CACHE_KEY)
    );
    
    return {
      totalEntries: courseQueries.length,
      totalCoursesCached: courseQueries.reduce((sum, query) => {
        const data = query.state.data as CacheEntry | undefined;
        return sum + (data?.data?.length || 0);
      }, 0),
      expiredEntries: courseQueries.filter(query => {
        const data = query.state.data as CacheEntry | undefined;
        return data && Date.now() > data.expiresAt;
      }).length
    };
  }, [queryClient]);

  return useMemo(() => ({
    getCachedCourses,
    setCachedCourses,
    invalidateCache,
    preloadCourses,
    getCacheStats
  }), [getCachedCourses, setCachedCourses, invalidateCache, preloadCourses, getCacheStats]);
}
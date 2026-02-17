/**
 * Hook for real course recommendations using external APIs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realCourseService, type RealCourse, type CourseSearchFilters } from '@/lib/courseAPIs';
import { calculateCourseCRI } from '@/lib/criCourseIntegration';
import { toast } from 'sonner';

/** @deprecated Use useIntelligenceLayer instead. This hook will be removed after Phase 2 migration. */
if (import.meta.env.DEV) {
  console.warn('[DEPRECATED] useRealCourseRecommendations imported: migrate to useIntelligenceLayer.');
}

export const useRealCourseRecommendations = (
  skillGaps: string[] = [],
  targetCRI: number = 80
) => {
  const queryClient = useQueryClient();

  // Get course recommendations based on skill gaps
  const {
    data: recommendations,
    isLoading: isLoadingRecommendations,
    error: recommendationsError
  } = useQuery({
    queryKey: ['real-course-recommendations', skillGaps, targetCRI],
    queryFn: async () => {
      if (skillGaps.length === 0) {
        console.log('[courses] No skill gaps provided, returning empty recommendations');
        return [];
      }
      
      console.log('[courses] Fetching recommendations for skills:', skillGaps.slice(0, 3));
      
      try {
        const courses = await realCourseService.getCourseRecommendations(skillGaps, targetCRI);
        console.log('[courses] Raw courses fetched:', courses.length);
        
        // Calculate CRI for each course with error handling
        const coursesWithCRI = await Promise.all(
          courses.map(async (course) => {
            try {
              const criBreakdown = await calculateCourseCRI({
                title: course.title,
                platform: course.platform,
                difficulty: course.difficulty,
                skill_tags: course.skill_tags,
                description: course.description,
                duration_hours: course.duration_hours,
                has_projects: course.has_projects,
                instructor_rating: course.instructor_rating
              });
              
              return {
                ...course,
                criBreakdown,
                criContribution: Math.min(criBreakdown.overall * 0.1, 15) // Max 15 points contribution
              };
            } catch (criError) {
              console.warn('[courses] CRI calculation failed for course:', course.title, criError);
              // Return course without CRI data rather than failing completely
              return {
                ...course,
                criBreakdown: { overall: 50, difficultyScore: 50, skillCoverage: 50, projectRigor: 50, outcomeConversion: 50, instructorRating: 50 },
                criContribution: 5 // Default contribution
              };
            }
          })
        );

        console.log('[courses] Courses with CRI calculated:', coursesWithCRI.length);
        return coursesWithCRI.sort((a, b) => b.criContribution - a.criContribution);
      } catch (error) {
        console.error('[courses] Error fetching recommendations:', error);
        // Return empty array instead of throwing to prevent tab from breaking
        return [];
      }
    },
    enabled: skillGaps.length > 0,
    retry: 2, // Retry failed requests twice
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000 // Keep in cache for 15 minutes
  });

  // Get trending courses
  const {
    data: trendingCourses,
    isLoading: isLoadingTrending,
    error: trendingError
  } = useQuery({
    queryKey: ['trending-real-courses'],
    queryFn: async () => {
      console.log('[courses] Fetching trending courses');
      
      try {
        const courses = await realCourseService.getTrendingCourses(6);
        console.log('[courses] Raw trending courses fetched:', courses.length);
        
        // Calculate CRI for trending courses with optimized error handling
        const coursesWithCRI = await Promise.all(
          courses.map(async (course) => {
            try {
              const criBreakdown = await calculateCourseCRI({
                title: course.title,
                platform: course.platform,
                difficulty: course.difficulty,
                skill_tags: course.skill_tags,
                description: course.description,
                duration_hours: course.duration_hours,
                has_projects: course.has_projects,
                instructor_rating: course.instructor_rating
              });
              
              return {
                ...course,
                criBreakdown
              };
            } catch (criError) {
              console.warn('[courses] CRI calculation failed for trending course:', course.title);
              // Return course without CRI rather than failing
              return {
                ...course,
                criBreakdown: { overall: 60, difficultyScore: 60, skillCoverage: 60, projectRigor: 60, outcomeConversion: 60, instructorRating: 60 }
              };
            }
          })
        );

        console.log('[courses] Trending courses with CRI calculated:', coursesWithCRI.length);
        return coursesWithCRI;
      } catch (error) {
        console.error('[courses] Error fetching trending courses:', error);
        // Return empty array to prevent total failure
        return [];
      }
    },
    retry: 2, // Retry failed requests twice
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000 // Keep in cache for 20 minutes
  });

  // Search courses with filters
  const searchCoursesMutation = useMutation({
    mutationFn: async (filters: CourseSearchFilters) => {
      const courses = await realCourseService.searchCourses(filters);
      
      // Calculate CRI for search results
      const coursesWithCRI = await Promise.all(
        courses.map(async (course) => {
          const criBreakdown = await calculateCourseCRI({
            title: course.title,
            platform: course.platform,
            difficulty: course.difficulty,
            skill_tags: course.skill_tags,
            description: course.description,
            duration_hours: course.duration_hours,
            has_projects: course.has_projects,
            instructor_rating: course.instructor_rating
          });
          
          return {
            ...course,
            criBreakdown
          };
        })
      );

      return coursesWithCRI;
    },
    onError: (error) => {
      console.error('Course search error:', error);
      toast.error('Failed to search courses');
    }
  });

  // Refetch recommendations
  const refetchRecommendations = () => {
    queryClient.invalidateQueries({ queryKey: ['real-course-recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['trending-real-courses'] });
  };

  return {
    recommendations: recommendations || [],
    trendingCourses: trendingCourses || [],
    isLoadingRecommendations,
    isLoadingTrending,
    recommendationsError,
    trendingError,
    searchCourses: searchCoursesMutation.mutate,
    searchResults: searchCoursesMutation.data || [],
    isSearching: searchCoursesMutation.isPending,
    searchError: searchCoursesMutation.error,
    refetchRecommendations
  };
};

export const useRealCourseSearch = () => {
  const searchCoursesMutation = useMutation({
    mutationFn: async (filters: CourseSearchFilters) => {
      return await realCourseService.searchCourses(filters);
    },
    onError: (error) => {
      console.error('Course search error:', error);
      toast.error('Failed to search courses');
    }
  });

  return {
    searchCourses: searchCoursesMutation.mutate,
    searchResults: searchCoursesMutation.data || [],
    isSearching: searchCoursesMutation.isPending,
    searchError: searchCoursesMutation.error,
    reset: searchCoursesMutation.reset
  };
};
/**
 * Hook for real course recommendations using external APIs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realCourseService, type RealCourse, type CourseSearchFilters } from '@/lib/courseAPIs';
import { calculateCourseCRI } from '@/lib/criCourseIntegration';
import { toast } from 'sonner';

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
      if (skillGaps.length === 0) return [];
      
      const courses = await realCourseService.getCourseRecommendations(skillGaps, targetCRI);
      
      // Calculate CRI for each course
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
            criBreakdown,
            criContribution: Math.min(criBreakdown.overall * 0.1, 15) // Max 15 points contribution
          };
        })
      );

      return coursesWithCRI.sort((a, b) => b.criContribution - a.criContribution);
    },
    enabled: skillGaps.length > 0,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Get trending courses
  const {
    data: trendingCourses,
    isLoading: isLoadingTrending
  } = useQuery({
    queryKey: ['trending-real-courses'],
    queryFn: async () => {
      const courses = await realCourseService.getTrendingCourses(6);
      
      // Calculate CRI for trending courses
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
    staleTime: 10 * 60 * 1000 // 10 minutes
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
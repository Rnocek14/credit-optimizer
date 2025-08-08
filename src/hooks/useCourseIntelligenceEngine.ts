/**
 * Course Intelligence & Educator Reputation Engine Hook
 * Comprehensive hook for managing courses, difficulty ratings, instructor profiles, and CRI scores
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ===== TYPES =====

export interface InstructorProfile {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  profile_image_url?: string;
  verification_status: string;
  prestige_tier: string;
  prestige_score: number;
  years_experience?: number;
  specialization_areas?: string[];
  linkedin_url?: string;
  website_url?: string;
  total_students: number;
  total_courses: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedCourse {
  id: string;
  title: string;
  description?: string;
  platform: string;
  course_url: string;
  instructor_name?: string;
  instructor_id?: string;
  instructor_profile?: InstructorProfile;
  difficulty_level?: string;
  estimated_hours: number;
  cost_usd: number;
  language: string;
  category?: string;
  subcategory?: string;
  is_active: boolean;
  verification_status: string;
  difficulty_rating?: CourseDifficultyRating;
  cri_score?: CourseCRIScore;
  skill_mappings?: CourseSkillMapping[];
  created_at: string;
  updated_at: string;
}

export interface CourseDifficultyRating {
  id: string;
  course_id: string;
  ai_difficulty_score?: number;
  user_average_difficulty?: number;
  normalized_difficulty?: number;
  total_user_ratings: number;
  confidence_score: number;
  ai_analysis_data: any;
}

export interface CourseCRIScore {
  id: string;
  course_id: string;
  overall_cri_score?: number;
  difficulty_score: number;
  skill_coverage_score: number;
  project_rigor_score: number;
  outcome_conversion_score: number;
  instructor_prestige_score: number;
  platform_credibility_score: number;
  market_relevance_score: number;
  calculation_version: string;
  calculation_data: any;
  historical_scores: any[];
}

export interface CourseSkillMapping {
  id: string;
  course_id: string;
  skill_name: string;
  skill_category?: string;
  relevance_score: number;
  skill_depth: string;
  hours_focus: number;
}

export interface InstructorRating {
  id: string;
  instructor_id: string;
  user_id: string;
  course_id: string;
  teaching_quality?: number;
  content_expertise?: number;
  engagement_level?: number;
  response_time?: number;
  overall_rating?: number;
  review_text?: string;
  would_recommend?: boolean;
  verification_status: string;
}

export interface UserCourseRating {
  id: string;
  user_id: string;
  course_id: string;
  difficulty_rating: number;
  time_to_complete_hours?: number;
  would_recommend?: boolean;
  review_text?: string;
  helpful_votes: number;
  verification_status: string;
  completion_verified: boolean;
}

export interface CourseFilters {
  platform?: string;
  category?: string;
  difficulty_level?: string;
  min_cri_score?: number;
  max_cri_score?: number;
  min_difficulty?: number;
  max_difficulty?: number;
  instructor_prestige_tier?: string;
  skill_name?: string;
  verified_only?: boolean;
}

// ===== MAIN HOOK =====

export const useCourseIntelligenceEngine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // ===== COURSE QUERIES =====

  const useEnhancedCourses = (filters?: CourseFilters) => {
    return useQuery({
      queryKey: ['enhanced-courses', filters],
      queryFn: async (): Promise<EnhancedCourse[]> => {
        let query = supabase
          .from('courses')
          .select(`
            *,
            instructor_profile:instructor_profiles(*),
            difficulty_rating:course_difficulty_ratings(*),
            cri_score:course_cri_scores(*),
            skill_mappings:course_skill_mappings(*)
          `)
          .eq('is_active', true);

        // Apply filters
        if (filters?.platform) {
          query = query.eq('platform', filters.platform);
        }
        if (filters?.category) {
          query = query.eq('category', filters.category);
        }
        if (filters?.difficulty_level) {
          query = query.eq('difficulty_level', filters.difficulty_level);
        }
        if (filters?.verified_only) {
          query = query.eq('verification_status', 'verified');
        }

        const { data, error } = await query;
        if (error) throw error;

        // Filter by CRI and difficulty scores if needed
        let filteredData = data || [];
        
        if (filters?.min_cri_score || filters?.max_cri_score) {
          filteredData = filteredData.filter(course => {
            const cri = course.cri_score?.overall_cri_score;
            if (!cri) return false;
            if (filters.min_cri_score && cri < filters.min_cri_score) return false;
            if (filters.max_cri_score && cri > filters.max_cri_score) return false;
            return true;
          });
        }

        if (filters?.min_difficulty || filters?.max_difficulty) {
          filteredData = filteredData.filter(course => {
            const difficulty = course.difficulty_rating?.normalized_difficulty;
            if (!difficulty) return false;
            if (filters.min_difficulty && difficulty < filters.min_difficulty) return false;
            if (filters.max_difficulty && difficulty > filters.max_difficulty) return false;
            return true;
          });
        }

        if (filters?.instructor_prestige_tier) {
          filteredData = filteredData.filter(course => 
            course.instructor_profile?.prestige_tier === filters.instructor_prestige_tier
          );
        }

        if (filters?.skill_name) {
          filteredData = filteredData.filter(course => 
            course.skill_mappings?.some(mapping => 
              mapping.skill_name.toLowerCase().includes(filters.skill_name!.toLowerCase())
            )
          );
        }

        return filteredData;
      }
    });
  };

  const useInstructorProfiles = (verified_only = false) => {
    return useQuery({
      queryKey: ['instructor-profiles', verified_only],
      queryFn: async (): Promise<InstructorProfile[]> => {
        let query = supabase.from('instructor_profiles').select('*');
        
        if (verified_only) {
          query = query.eq('verification_status', 'verified');
        }

        const { data, error } = await query.order('prestige_score', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    });
  };

  const useCourseDetails = (courseId: string) => {
    return useQuery({
      queryKey: ['course-details', courseId],
      queryFn: async (): Promise<EnhancedCourse | null> => {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            instructor_profile:instructor_profiles(*),
            difficulty_rating:course_difficulty_ratings(*),
            cri_score:course_cri_scores(*),
            skill_mappings:course_skill_mappings(*),
            instructor_ratings!instructor_ratings_course_id_fkey(
              *,
              instructor_profile:instructor_profiles(*)
            ),
            user_ratings:user_course_ratings(*)
          `)
          .eq('id', courseId)
          .single();

        if (error) throw error;
        return data;
      }
    });
  };

  // ===== RATING MUTATIONS =====

  const submitCourseRating = useMutation({
    mutationFn: async (rating: Omit<UserCourseRating, 'id' | 'created_at' | 'updated_at' | 'helpful_votes' | 'verification_status'>) => {
      const { data, error } = await supabase
        .from('user_course_ratings')
        .upsert({
          ...rating,
          verification_status: 'verified'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-details', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-courses'] });
      toast.success('Course rating submitted successfully!');
    },
    onError: (error) => {
      console.error('Error submitting course rating:', error);
      toast.error('Failed to submit course rating');
    }
  });

  const submitInstructorRating = useMutation({
    mutationFn: async (rating: Omit<InstructorRating, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('instructor_ratings')
        .upsert({
          ...rating,
          verification_status: 'verified'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-details', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['instructor-profiles'] });
      toast.success('Instructor rating submitted successfully!');
    },
    onError: (error) => {
      console.error('Error submitting instructor rating:', error);
      toast.error('Failed to submit instructor rating');
    }
  });

  // ===== UTILITY FUNCTIONS =====

  const getPrestigeBadgeColor = (tier: string) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800 border-amber-200',
      silver: 'bg-gray-100 text-gray-800 border-gray-200',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      platinum: 'bg-blue-100 text-blue-800 border-blue-200',
      diamond: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[tier as keyof typeof colors] || colors.bronze;
  };

  const getDifficultyColor = (level: string | number) => {
    if (typeof level === 'number') {
      if (level <= 2) return 'bg-green-100 text-green-800 border-green-200';
      if (level <= 3.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    const colors = {
      beginner: 'bg-green-100 text-green-800 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      advanced: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[level as keyof typeof colors] || colors.beginner;
  };

  const getCRIColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatStars = (rating?: number) => {
    if (!rating) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
  };

  const clearError = () => setError(null);

  return {
    // Queries
    useEnhancedCourses,
    useInstructorProfiles,
    useCourseDetails,
    
    // Mutations
    submitCourseRating,
    submitInstructorRating,
    
    // Utility functions
    getPrestigeBadgeColor,
    getDifficultyColor,
    getCRIColor,
    formatStars,
    
    // State
    loading,
    error,
    clearError
  };
};

export default useCourseIntelligenceEngine;
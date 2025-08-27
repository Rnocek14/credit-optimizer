/**
 * Hook for CRI Engine Integration
 * Connects to the new cri-calculation-engine edge function
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CRIComponents {
  skills: number;
  experience: number;
  education: number;
  portfolio: number;
  marketReadiness: number;
}

export interface CRIBreakdown {
  criScore: number;
  level: 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert';
  components: CRIComponents;
  insights: string[];
  trend: { 
    direction: 'improving' | 'declining' | 'stable'; 
    change: number; 
    percentage?: number; 
  };
  lastCalculated: string;
  recommendations: Array<{
    area: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface MayaExplanation {
  explanation: string;
  reasoning: string;
  confidence: number;
  source: string;
}

export const useCRIEngine = (userId?: string, trackId?: string) => {
  const queryClient = useQueryClient();

  // Fetch CRI breakdown from actual database tables
  const { data: criBreakdown, isLoading: criLoading, error: criError } = useQuery({
    queryKey: ['cri-breakdown', userId, trackId],
    queryFn: async (): Promise<CRIBreakdown | null> => {
      if (!userId) throw new Error('User ID required');
      
      try {
        // First try to get existing CRI data from user_cri_scores
        const { data: criData, error: criError } = await supabase
          .from('user_cri_scores')
          .select('*')
          .eq('user_id', userId)
          .order('last_calculated', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (criError) {
          console.error('Error fetching CRI data:', criError);
          throw criError;
        }

        if (!criData) {
          // No CRI data exists, trigger calculation via edge function
          console.log('No CRI data found, triggering calculation...');
          const { data, error } = await supabase.functions.invoke('cri-calculation-engine', {
            body: {
              action: 'calculate_cri',
              userId,
              trackId,
            }
          });

          if (error) throw error;
          return data;
        }

        // Map existing data to expected format
        return {
          criScore: criData.current_cri_score || 0,
          level: (criData.readiness_level as 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert') || 'Beginner',
          components: {
            skills: criData.skill_completion_percentage || 0,
            experience: criData.experience_score || 0,
            education: 0, // Calculate from other data
            portfolio: 0, // Calculate from other data
            marketReadiness: 0, // Calculate from other data
          },
          insights: criData.next_priority_items || [],
          trend: { 
            direction: 'stable' as const, 
            change: 0 
          },
          lastCalculated: criData.last_calculated || criData.created_at,
          recommendations: (criData.blocking_factors || []).map((factor: string) => ({
            area: 'General',
            action: factor,
            priority: 'medium' as const
          })),
        };
      } catch (error) {
        console.error('Error in CRI breakdown fetch:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
  });

  // Recalculate CRI mutation
  const recalculateCRIMutation = useMutation({
    mutationFn: async (trackId?: string): Promise<CRIBreakdown> => {
      if (!userId) throw new Error('User ID required');
      
      console.log('Triggering CRI recalculation for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('cri-calculation-engine', {
        body: {
          action: 'calculate_cri',
          userId,
          trackId,
        }
      });

      if (error) {
        console.error('CRI calculation error:', error);
        throw new Error(error.message || 'Failed to calculate CRI');
      }
      
      if (!data) {
        throw new Error('No data returned from CRI calculation');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cri-breakdown', userId, trackId], data);
      queryClient.invalidateQueries({ queryKey: ['cri-breakdown', userId] });
      toast({ title: 'CRI updated', description: 'Your Career Readiness Index was recalculated successfully.' });
    },
    onError: (error: any) => {
      console.error('Error recalculating CRI:', error);
      toast({ title: 'Failed to recalculate CRI', description: error?.message || 'Unknown error', variant: 'destructive' });
    }
  });

  // Get Maya explanation mutation
  const getMayaExplanationMutation = useMutation({
    mutationFn: async (params: {
      context: any;
      stepId?: string;
    }): Promise<MayaExplanation> => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase.functions.invoke('maya-execution-engine', {
        body: {
          action: 'generate_explanation',
          userId,
          stepId: params.stepId || 'cri_action',
          context: params.context,
        }
      });

      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      console.error('Error getting Maya explanation:', error);
      toast({ title: 'Could not get explanation', description: error?.message || 'Please try again later.', variant: 'destructive' });
    }
  });

  const recalculateCRI = useCallback((trackId?: string) => {
    if (!userId) {
      toast({ title: 'Sign in required', description: 'Please sign in to calculate your CRI.', variant: 'destructive' });
      return;
    }
    recalculateCRIMutation.mutate(trackId);
  }, [recalculateCRIMutation, userId]);

  const getMayaExplanation = useCallback((context: any, stepId?: string) => {
    if (!userId) {
      toast({ title: 'Sign in required', description: 'Please sign in to use Maya explanations.', variant: 'destructive' });
      return;
    }
    getMayaExplanationMutation.mutate({ context, stepId });
  }, [getMayaExplanationMutation, userId]);

  return {
    // Data
    criBreakdown,
    mayaExplanation: getMayaExplanationMutation.data,
    
    // Loading states
    isLoading: criLoading,
    isRecalculating: recalculateCRIMutation.isPending,
    isExplaining: getMayaExplanationMutation.isPending,
    
    // Errors
    error: criError,
    
    // Actions
    recalculateCRI,
    getMayaExplanation,
  };
};
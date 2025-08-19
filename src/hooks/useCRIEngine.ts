/**
 * Hook for CRI Engine Integration
 * Connects to the new cri-calculation-engine edge function
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Fetch CRI breakdown
  const { data: criBreakdown, isLoading: criLoading, error: criError } = useQuery({
    queryKey: ['cri-breakdown', userId, trackId],
    queryFn: async (): Promise<CRIBreakdown> => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase.functions.invoke('cri-calculation-engine', {
        body: {
          action: 'get_breakdown',
          userId,
          trackId,
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Recalculate CRI mutation
  const recalculateCRIMutation = useMutation({
    mutationFn: async (trackId?: string): Promise<CRIBreakdown> => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase.functions.invoke('cri-calculation-engine', {
        body: {
          action: 'calculate_cri',
          userId,
          trackId,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cri-breakdown', userId, trackId], data);
      toast.success('CRI recalculated successfully!');
    },
    onError: (error: any) => {
      console.error('Error recalculating CRI:', error);
      toast.error('Failed to recalculate CRI');
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
      toast.error('Failed to get explanation');
    }
  });

  const recalculateCRI = useCallback((trackId?: string) => {
    recalculateCRIMutation.mutate(trackId);
  }, [recalculateCRIMutation]);

  const getMayaExplanation = useCallback((context: any, stepId?: string) => {
    getMayaExplanationMutation.mutate({ context, stepId });
  }, [getMayaExplanationMutation]);

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
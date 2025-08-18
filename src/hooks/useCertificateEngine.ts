/**
 * Hook for Certificate Engine Integration
 * Connects to the new certificate-generation edge function
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Certificate {
  id: string;
  type: 'workflow_completion' | 'course_completion' | 'skill_verification' | 'career_milestone';
  title: string;
  description: string;
  skills: string[];
  completionDate: string;
  issueDate: string;
  verificationCode: string;
  certificateNumber: string;
  isVerified: boolean;
  downloadUrl: string;
  metadata?: any;
  validUntil?: string;
}

export interface CertificateListResponse {
  certificates: Certificate[];
  totalCount: number;
  verified: number;
}

export interface GenerateCertificateParams {
  certificateType: Certificate['type'];
  certificateData: {
    title: string;
    description: string;
    skills?: string[];
    workflowId?: string;
    courseId?: string;
    metadata?: any;
  };
}

export const useCertificateEngine = (userId?: string) => {
  const queryClient = useQueryClient();

  // Fetch user certificates
  const { data: certificateData, isLoading: certificatesLoading, error: certificatesError } = useQuery({
    queryKey: ['certificates', userId],
    queryFn: async (): Promise<CertificateListResponse> => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase.functions.invoke('certificate-generation', {
        body: {
          action: 'list_certificates',
          userId,
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Generate certificate mutation
  const generateCertificateMutation = useMutation({
    mutationFn: async (params: GenerateCertificateParams) => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase.functions.invoke('certificate-generation', {
        body: {
          action: 'generate_certificate',
          userId,
          ...params,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certificates', userId] });
      toast.success('Certificate generated successfully!');
      return data;
    },
    onError: (error: any) => {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    }
  });

  // Verify certificate mutation
  const verifyCertificateMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      const { data, error } = await supabase.functions.invoke('certificate-generation', {
        body: {
          action: 'verify_certificate',
          verificationCode,
        }
      });

      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      console.error('Error verifying certificate:', error);
      toast.error('Failed to verify certificate');
    }
  });

  const generateCertificate = useCallback((params: GenerateCertificateParams) => {
    return generateCertificateMutation.mutateAsync(params);
  }, [generateCertificateMutation]);

  const verifyCertificate = useCallback((verificationCode: string) => {
    return verifyCertificateMutation.mutateAsync(verificationCode);
  }, [verifyCertificateMutation]);

  return {
    // Data
    certificates: certificateData?.certificates || [],
    totalCount: certificateData?.totalCount || 0,
    verifiedCount: certificateData?.verified || 0,
    verificationResult: verifyCertificateMutation.data,
    
    // Loading states
    isLoading: certificatesLoading,
    isGenerating: generateCertificateMutation.isPending,
    isVerifying: verifyCertificateMutation.isPending,
    
    // Errors
    error: certificatesError,
    
    // Actions
    generateCertificate,
    verifyCertificate,
  };
};
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkflowCertificate {
  id: string;
  user_id: string;
  workflow_id: string;
  certificate_number: string;
  verification_code: string;
  certificate_type: string;
  issued_at: string;
  expires_at?: string;
  is_revoked: boolean;
  workflow_title: string;
  workflow_description?: string;
  completion_date: string;
  maya_confidence_score: number;
  user_feedback_score?: number;
  total_decisions: number;
  autonomous_steps: number;
  manual_steps: number;
  certificate_data: any;
  created_at: string;
  updated_at: string;
}

export function useWorkflowCertificates() {
  const [certificates, setCertificates] = useState<WorkflowCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUserCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workflow_certificates')
        .select('*')
        .eq('is_revoked', false)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      setCertificates(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateCertificate = useCallback(async (workflowId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-workflow-certificate', {
        body: {
          workflowId,
          userId: user.user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Certificate Generated!",
          description: `Your "Trusted by Maya" certificate has been created`,
        });
        
        await fetchUserCertificates(); // Refresh the list
        return data.certificate;
      } else {
        throw new Error(data.error || 'Failed to generate certificate');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Certificate Generation Failed",
        description: err.message,
        variant: "destructive",
      });
      console.error('Error generating certificate:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUserCertificates]);

  const verifyCertificate = useCallback(async (verificationCode: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workflow_certificates')
        .select('*')
        .eq('verification_code', verificationCode.toUpperCase())
        .eq('is_revoked', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Certificate not found or invalid verification code');
        }
        throw error;
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error verifying certificate:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCertificatesByWorkflow = useCallback((workflowId: string) => {
    return certificates.filter(cert => cert.workflow_id === workflowId);
  }, [certificates]);

  const getTotalCertificates = useCallback(() => {
    return certificates.length;
  }, [certificates]);

  const getAverageConfidenceScore = useCallback(() => {
    if (certificates.length === 0) return 0;
    const total = certificates.reduce((sum, cert) => sum + cert.maya_confidence_score, 0);
    return total / certificates.length;
  }, [certificates]);

  const getCertificateStats = useCallback(() => {
    return {
      total: certificates.length,
      avgConfidence: getAverageConfidenceScore(),
      totalDecisions: certificates.reduce((sum, cert) => sum + cert.total_decisions, 0),
      totalAutonomousSteps: certificates.reduce((sum, cert) => sum + cert.autonomous_steps, 0),
      avgUserRating: certificates.filter(c => c.user_feedback_score).length > 0
        ? certificates
            .filter(c => c.user_feedback_score)
            .reduce((sum, cert) => sum + (cert.user_feedback_score || 0), 0) / 
          certificates.filter(c => c.user_feedback_score).length
        : 0
    };
  }, [certificates, getAverageConfidenceScore]);

  return {
    certificates,
    loading,
    error,
    fetchUserCertificates,
    generateCertificate,
    verifyCertificate,
    getCertificatesByWorkflow,
    getTotalCertificates,
    getAverageConfidenceScore,
    getCertificateStats
  };
}
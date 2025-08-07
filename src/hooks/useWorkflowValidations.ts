import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowValidation {
  id: string;
  user_id: string;
  step_id?: string | null;
  source_type: 'maya_decision' | 'mentor_review' | 'cri_score' | 'peer_validation' | 'system_auto';
  source_id?: string | null;
  confidence_score: number;
  validation_score: number;
  validation_data: any;
  validated_by?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ValidationMetrics {
  user_id: string;
  total_validations: number;
  avg_validation_score: number | null;
  avg_confidence_score: number | null;
  high_score_validations: number;
  maya_validations: number;
  mentor_validations: number;
  cri_validations: number;
  peer_validations: number;
  last_validation_at: string | null;
  validation_breakdown: any;
}

export function useWorkflowValidations(userId?: string) {
  const [validations, setValidations] = useState<WorkflowValidation[]>([]);
  const [metrics, setMetrics] = useState<ValidationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch validations
  const fetchValidations = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_validations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setValidations((data || []) as WorkflowValidation[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching validations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch validation metrics
  const fetchMetrics = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_validation_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setMetrics(data as ValidationMetrics);
    } catch (err: any) {
      console.error('Error fetching validation metrics:', err);
    }
  };

  // Create validation from Maya decision
  const createMayaValidation = async (mayaDecisionId: string, validationScore: number, confidenceScore: number) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('workflow_validations')
        .insert({
          user_id: userId,
          source_type: 'maya_decision',
          source_id: mayaDecisionId,
          validation_score: validationScore,
          confidence_score: confidenceScore,
          validation_data: {
            decision_type: 'autonomous_workflow',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      setValidations(prev => [data as WorkflowValidation, ...prev]);
      await fetchMetrics();

      toast({
        title: "Validation Created",
        description: `Maya decision validation added with ${validationScore}% score`,
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Validation Failed",
        description: err.message,
        variant: "destructive"
      });
      return null;
    }
  };

  // Create validation from CRI score
  const createCRIValidation = async (resumeId: string, criScore: number) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('workflow_validations')
        .insert({
          user_id: userId,
          source_type: 'cri_score',
          source_id: resumeId,
          validation_score: criScore,
          confidence_score: 0.85,
          validation_data: {
            cri_score: criScore,
            source: 'resume_analysis',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      setValidations(prev => [data as WorkflowValidation, ...prev]);
      await fetchMetrics();

      return data;
    } catch (err: any) {
      console.error('Error creating CRI validation:', err);
      return null;
    }
  };

  // Connect existing Phase 5 data
  const syncWithPhase5Data = async () => {
    if (!userId) return;

    try {
      console.log('🔄 Syncing Phase 5 data for user:', userId);

      // Check existing validations to avoid duplicates
      const { data: existingValidations } = await supabase
        .from('workflow_validations')
        .select('source_id')
        .eq('user_id', userId);

      const existingSourceIds = new Set(existingValidations?.map(v => v.source_id) || []);

      // Fetch Maya decisions and create validations
      const { data: mayaDecisions } = await supabase
        .from('maya_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      let newValidations = 0;
      if (mayaDecisions) {
        for (const decision of mayaDecisions) {
          if (!existingSourceIds.has(decision.id)) {
            const validationScore = Math.min(decision.confidence_score * 100, 95);
            await createMayaValidation(decision.id, validationScore, decision.confidence_score);
            newValidations++;
          }
        }
      }

      // Fetch CRI scores from resume drafts
      const { data: resumeDrafts } = await supabase
        .from('ai_resume_drafts')
        .select('*')
        .eq('user_id', userId)
        .not('cri_average', 'is', null)
        .limit(5);

      if (resumeDrafts) {
        for (const resume of resumeDrafts) {
          if (resume.cri_average && !existingSourceIds.has(resume.id)) {
            await createCRIValidation(resume.id, resume.cri_average);
            newValidations++;
          }
        }
      }

      console.log(`✅ Sync complete: ${newValidations} new validations created`);

      toast({
        title: "Phase 5 Data Synced", 
        description: `Created ${newValidations} new validations from existing Phase 5 data`,
      });

    } catch (err: any) {
      console.error('Error syncing Phase 5 data:', err);
    }
  };

  useEffect(() => {
    fetchValidations();
    fetchMetrics();
  }, [userId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('workflow-validations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_validations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setValidations(prev => [payload.new as WorkflowValidation, ...prev]);
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    validations,
    metrics,
    loading,
    error,
    createMayaValidation,
    createCRIValidation,
    syncWithPhase5Data,
    refetch: fetchValidations
  };
}